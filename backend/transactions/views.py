from datetime import timedelta
import urllib.error
from django.conf import settings
from django.utils import timezone
from django.db.models import Q as models_Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAuthenticated
from books.models import BookCopy
from core.models import Notification
from .models import BorrowTransaction, Reservation, Fine, Payment, PaymentReceipt
from .serializers import (
    BorrowTransactionSerializer, BorrowCreateSerializer,
    ReturnSerializer, ReservationSerializer, FineSerializer,
    BorrowHistorySerializer, PaymentSerializer,
)
from .signals import calculate_fine
from .mpesa import stk_push, normalize_phone


class BorrowViewSet(viewsets.ModelViewSet):
    serializer_class = BorrowTransactionSerializer

    def get_queryset(self):
        if self.request.user.role in ('admin', 'librarian'):
            return BorrowTransaction.objects.select_related(
                'user', 'issued_by', 'returned_by', 'book_copy__book'
            ).all()
        return BorrowTransaction.objects.filter(user=self.request.user).select_related('book_copy__book')

    @action(detail=False, methods=['post'])
    def issue(self, request):
        serializer = BorrowCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            copy = BookCopy.objects.get(id=serializer.validated_data['book_copy'], status='available')
        except BookCopy.DoesNotExist:
            return Response({'detail': 'Copy not available'}, status=status.HTTP_400_BAD_REQUEST)

        copy.status = 'issued'
        copy.save()

        transaction = BorrowTransaction.objects.create(
            user=request.user,
            book_copy=copy,
            due_date=timezone.now() + timedelta(days=14),
            issued_by=request.user,
        )
        out = BorrowTransactionSerializer(transaction)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def return_book(self, request):
        serializer = ReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            transaction = BorrowTransaction.objects.get(
                book_copy_id=serializer.validated_data['book_copy'],
                status__in=['issued', 'overdue'],
            )
        except BorrowTransaction.DoesNotExist:
            return Response({'detail': 'No active borrow for this copy'}, status=status.HTTP_400_BAD_REQUEST)

        transaction.return_date = timezone.now()
        transaction.status = 'returned'
        transaction.returned_by = request.user
        transaction.save()

        transaction.book_copy.status = 'available'
        transaction.book_copy.save()

        fine_amount = calculate_fine(transaction)
        if fine_amount > 0:
            Fine.objects.create(transaction=transaction, amount=fine_amount)

        out = BorrowTransactionSerializer(transaction)
        data = out.data
        data['fine'] = fine_amount
        return Response(data)

    @action(detail=False, methods=['get'])
    def history(self, request):
        qs = BorrowTransaction.objects.select_related(
            'user', 'issued_by', 'returned_by', 'book_copy__book'
        ).prefetch_related('book_copy__book__authors', 'fines').all()

        status_filter = request.query_params.get('status')
        if status_filter in ('active', 'returned', 'overdue'):
            if status_filter == 'active':
                qs = qs.filter(status__in=['issued', 'overdue'])
            else:
                qs = qs.filter(status=status_filter)

        search = request.query_params.get('q', '').strip()
        if search:
            qs = qs.filter(
                models_Q(user__username__icontains=search) |
                models_Q(user__first_name__icontains=search) |
                models_Q(user__last_name__icontains=search) |
                models_Q(user__membership_id__icontains=search) |
                models_Q(book_copy__barcode__icontains=search) |
                models_Q(book_copy__book__title__icontains=search) |
                models_Q(book_copy__book__isbn__icontains=search)
            )

        qs = qs.order_by('-issue_date')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(BorrowHistorySerializer(page, many=True).data)
        return Response(BorrowHistorySerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def my_borrows(self, request):
        qs = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search_copy(self, request):
        q = request.query_params.get('q', '')
        qs = BookCopy.objects.select_related('book').all()
        if q:
            qs = qs.filter(
                models_Q(barcode__icontains=q) |
                models_Q(book__title__icontains=q) |
                models_Q(book__isbn__icontains=q)
            )
        qs = qs.order_by('book__title', 'id')[:20]
        from books.serializers import BookCopySearchSerializer
        return Response(BookCopySearchSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        qs = self.get_queryset().filter(status='overdue')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer

    def get_queryset(self):
        if self.request.user.role in ('admin', 'librarian'):
            return Reservation.objects.all()
        return Reservation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FineViewSet(viewsets.ModelViewSet):
    serializer_class = FineSerializer

    def get_queryset(self):
        if self.request.user.role in ('admin', 'librarian'):
            return Fine.objects.all()
        return Fine.objects.filter(transaction__user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_fines(self, request):
        fines = (
            Fine.objects
            .filter(transaction__user=request.user)
            .select_related('transaction__book_copy__book')
            .prefetch_related('payments')
            .order_by('-created_at')
        )
        data = []
        for f in fines:
            payment = f.payments.order_by('-created_at').first()
            data.append({
                'id': f.id,
                'amount': f.amount,
                'paid': f.paid,
                'created_at': f.created_at,
                'book_title': (
                    f.transaction.book_copy.book.title
                    if f.transaction and f.transaction.book_copy else 'Unknown'
                ),
                'payment_status': payment.status if payment else None,
                'receipt': payment.receipt if payment else None,
                'receipt_number': (
                    payment.receipt_record.receipt_number
                    if payment and getattr(payment, 'receipt_record', None) else None
                ),
            })
        return Response(data)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = (
            Payment.objects
            .select_related('user', 'fine__transaction__book_copy__book', 'receipt_record')
            .all()
        )
        if self.request.user.role not in ('admin', 'librarian'):
            qs = qs.filter(user=self.request.user)
        return qs.order_by('-created_at')


class PayFineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(settings, 'MPESA_ENABLED', False):
            raise APIException('M-Pesa payments are not enabled on this server.')

        fine_id = request.data.get('fine_id')
        phone = request.data.get('phone')
        if not fine_id or not phone:
            return Response(
                {'detail': 'fine_id and phone are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fine = Fine.objects.select_related('transaction__user').get(
                id=fine_id, transaction__user=request.user,
            )
        except Fine.DoesNotExist:
            return Response({'detail': 'Fine not found.'}, status=status.HTTP_404_NOT_FOUND)

        if fine.paid:
            return Response(
                {'detail': 'This fine is already paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        phone = normalize_phone(phone)
        if not phone:
            return Response(
                {'detail': 'A valid phone number is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        callback = settings.MPESA_CALLBACK_URL or request.build_absolute_uri(
            '/api/transactions/mpesa/callback/'
        )

        try:
            result = stk_push(
                phone=phone,
                amount=fine.amount,
                account_ref=f"LMS{fine.id}",
                description=f"Fine {fine.id}",
                callback_url=callback,
            )
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError) as e:
            return Response(
                {'detail': f'Could not initiate M-Pesa payment: {e}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        checkout_id = result.get('CheckoutRequestID')
        if not checkout_id:
            return Response(
                {'detail': 'M-Pesa did not return a checkout request.', 'raw': result},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment = Payment.objects.create(
            user=request.user,
            fine=fine,
            amount=fine.amount,
            method='mpesa',
            phone=str(phone),
            checkout_request_id=checkout_id,
            merchant_request_id=result.get('MerchantRequestID'),
            status='pending',
        )

        return Response(
            {
                'status': 'pending',
                'message': 'STK push sent. Check your phone and enter your M-Pesa PIN to complete the payment.',
                'payment_id': payment.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class MpesaCallbackView(APIView):
    permission_classes = []

    def post(self, request):
        body = request.data.get('Body', {}) or {}
        stk = body.get('stkCallback', {}) or {}
        checkout_id = stk.get('CheckoutRequestID')
        result_code = stk.get('ResultCode')
        result_desc = stk.get('ResultDesc', '')

        if not checkout_id:
            return Response({'status': 'ignored'})

        payment = Payment.objects.filter(checkout_request_id=checkout_id).first()
        if not payment:
            return Response({'status': 'unknown'})

        metadata = {}
        for item in stk.get('CallbackMetadata', {}).get('Item', []):
            metadata[item.get('Name')] = item.get('Value')
        receipt = metadata.get('MpesaReceiptNumber', '')

        if result_code == 0:
            payment.status = 'completed'
            payment.receipt = receipt
            payment.result_desc = result_desc
            payment.completed_at = timezone.now()
            payment.save()

            PaymentReceipt.objects.get_or_create(payment=payment)

            fine = payment.fine
            if fine and not fine.paid:
                fine.paid = True
                fine.paid_at = timezone.now()
                fine.save()
                Notification.objects.create(
                    recipient=payment.user,
                    message=(
                        f"M-Pesa payment of KES {payment.amount} received "
                        f"(Receipt: {receipt}). Fine #{fine.id} is now settled."
                    ),
                )
        else:
            payment.status = 'failed'
            payment.result_desc = result_desc
            payment.save()
            Notification.objects.create(
                recipient=payment.user,
                message=(
                    f"Your M-Pesa payment of KES {payment.amount} failed: {result_desc}"
                ),
            )

        return Response({'status': 'ok'})
