from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from books.models import Book, BookCopy
from transactions.models import BorrowTransaction, Fine, Reservation
from core.models import CustomUser


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'member':
            active_borrows = BorrowTransaction.objects.filter(user=user, status='issued')
            overdue = BorrowTransaction.objects.filter(user=user, status='overdue')
            fines = Fine.objects.filter(transaction__user=user, paid=False)
            reservations = Reservation.objects.filter(user=user, status='pending')

            active_borrows_data = []
            for t in active_borrows.select_related('book_copy__book'):
                active_borrows_data.append({
                    'id': t.id,
                    'title': t.book_copy.book.title,
                    'issue_date': t.issue_date,
                    'due_date': t.due_date,
                    'status': t.status,
                })

            overdue_data = []
            for t in overdue.select_related('book_copy__book'):
                overdue_data.append({
                    'id': t.id,
                    'title': t.book_copy.book.title,
                    'due_date': t.due_date,
                    'status': t.status,
                })

            return Response({
                'active_borrows_count': active_borrows.count(),
                'overdue_count': overdue.count(),
                'unpaid_fines': sum(f.amount for f in fines),
                'fines_count': fines.count(),
            'reservations_count': reservations.count(),
            'active_borrows': active_borrows_data,
            'overdue': overdue_data,
        })

        total_books = Book.objects.count()
        total_copies = BookCopy.objects.count()
        available_copies = BookCopy.objects.filter(status='available').count()
        total_members = CustomUser.objects.filter(role='member').count()
        active_borrows = BorrowTransaction.objects.filter(status='issued').count()
        overdue_count = BorrowTransaction.objects.filter(status='overdue').count()
        total_fines = Fine.objects.filter(paid=False).aggregate(total=Count('id'))['total']

        popular_books = Book.objects.annotate(
            borrow_count=Count('copies__transactions')
        ).order_by('-borrow_count')[:5]

        popular_data = [{'title': b.title, 'count': b.borrow_count} for b in popular_books]

        borrow_trends = BorrowTransaction.objects.filter(status='issued').order_by('issue_date')[:7]

        trend_data = []
        for item in borrow_trends:
            trend_data.append({
                'id': item.id,
                'book_title': item.book_copy.book.title if item.book_copy and item.book_copy.book_id else 'Unknown',
                'issue_date': item.issue_date,
            })

        return Response({
            'total_books': total_books,
            'total_copies': total_copies,
            'available_copies': available_copies,
            'total_members': total_members,
            'active_borrows': active_borrows,
            'overdue_count': overdue_count,
            'total_fines': total_fines,
            'popular_books': popular_data,
            'borrow_trends': trend_data,
        })
