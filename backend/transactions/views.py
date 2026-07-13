from datetime import timedelta
from django.utils import timezone
from django.db.models import Q as models_Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from books.models import BookCopy
from .models import BorrowTransaction, Reservation, Fine
from .serializers import (
    BorrowTransactionSerializer, BorrowCreateSerializer,
    ReturnSerializer, ReservationSerializer, FineSerializer,
)
from .signals import calculate_fine


class BorrowViewSet(viewsets.ModelViewSet):
    serializer_class = BorrowTransactionSerializer

    def get_queryset(self):
        if self.request.user.role in ('admin', 'librarian'):
            return BorrowTransaction.objects.select_related('user', 'book_copy__book').all()
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
