from datetime import timedelta
from django.utils import timezone
import calendar

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth

from books.models import Book, BookCopy, Category
from transactions.models import BorrowTransaction, Fine, Reservation
from core.models import CustomUser


def last_months(n):
    now = timezone.now()
    months = []
    y, m = now.year, now.month
    for _ in range(n):
        months.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(months))


def month_labels(months):
    return [f"{calendar.month_abbr[m]} '{str(y)[2:]}" for y, m in months]


def build_monthly_series(months, rows, value_key='total'):
    lookup = {}
    for r in rows:
        dt = r['month']
        lookup[(dt.year, dt.month)] = float(r[value_key])
    return [round(lookup.get((y, m), 0), 2) for y, m in months]


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

        months = last_months(12)
        start = timezone.now() - timedelta(days=365)

        # ----- Revenue (fines actually collected) -----
        revenue_rows = (
            Fine.objects
            .filter(paid=True, paid_at__gte=start)
            .annotate(month=TruncMonth('paid_at'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        revenue_data = build_monthly_series(months, revenue_rows)
        total_revenue = round(sum(revenue_data), 2)
        unpaid_fines = round(
            Fine.objects.filter(paid=False).aggregate(total=Sum('amount'))['total'] or 0, 2
        )

        # ----- Book copies by status -----
        status_rows = BookCopy.objects.values('status').annotate(c=Count('id'))
        status_counts = {r['status']: r['c'] for r in status_rows}
        books_status = {
            'available': status_counts.get('available', 0),
            'issued': status_counts.get('issued', 0),
            'damaged': status_counts.get('damaged', 0),
            'lost': status_counts.get('lost', 0),
        }

        # ----- Borrowing activity (issues per month) -----
        issued_rows = (
            BorrowTransaction.objects
            .filter(issue_date__gte=start)
            .annotate(month=TruncMonth('issue_date'))
            .values('month')
            .annotate(c=Count('id'))
            .order_by('month')
        )
        issued_data = build_monthly_series(months, issued_rows, value_key='c')

        # ----- Returns per month -----
        returned_rows = (
            BorrowTransaction.objects
            .filter(return_date__gte=start)
            .annotate(month=TruncMonth('return_date'))
            .values('month')
            .annotate(c=Count('id'))
            .order_by('month')
        )
        returned_data = build_monthly_series(months, returned_rows, value_key='c')

        # ----- Popular books -----
        popular_books = Book.objects.annotate(
            borrow_count=Count('copies__transactions')
        ).order_by('-borrow_count')[:5]
        popular_data = [{'title': b.title, 'count': b.borrow_count} for b in popular_books]

        # ----- Category distribution -----
        category_rows = Category.objects.annotate(c=Count('books')).order_by('-c')
        category_data = [
            {'label': c.name, 'value': c.c} for c in category_rows if c.c > 0
        ][:8]

        # ----- Headline counts -----
        total_books = Book.objects.count()
        total_copies = BookCopy.objects.count()
        available_copies = books_status['available']
        total_members = CustomUser.objects.filter(role='member').count()
        active_borrows = BorrowTransaction.objects.filter(status='issued').count()
        overdue_count = BorrowTransaction.objects.filter(status='overdue').count()
        total_fines_count = Fine.objects.count()

        return Response({
            'total_books': total_books,
            'total_copies': total_copies,
            'available_copies': available_copies,
            'total_members': total_members,
            'active_borrows': active_borrows,
            'overdue_count': overdue_count,
            'total_fines': total_fines_count,
            'total_revenue': total_revenue,
            'unpaid_fines': unpaid_fines,
            'revenue': {
                'labels': month_labels(months),
                'data': revenue_data,
                'total': total_revenue,
            },
            'books_status': books_status,
            'borrowing_trend': {
                'labels': month_labels(months),
                'issued': issued_data,
                'returned': returned_data,
            },
            'popular_books': popular_data,
            'categories': category_data,
        })
