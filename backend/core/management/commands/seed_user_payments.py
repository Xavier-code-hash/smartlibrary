from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import random

from books.models import Book, BookCopy
from transactions.models import BorrowTransaction, Fine, Payment, PaymentReceipt

User = get_user_model()
FINE_PER_DAY = 5


class Command(BaseCommand):
    help = 'Seed mock payment data for a specific user (default: will@gmail.com)'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='will@gmail.com', help='User email to seed payments for')
        parser.add_argument('--count', type=int, default=8, help='Number of paid payments to create')

    @transaction.atomic
    def handle(self, *args, **options):
        email = options['email']
        count = options['count']

        user = User.objects.filter(email=email).first()
        if not user:
            self.stderr.write(self.style.ERROR(f'User with email {email} not found.'))
            return

        user.phone = user.phone or '0711223344'
        user.membership_id = user.membership_id or 'MEM-WILL-001'
        user.first_name = user.first_name or 'Will'
        user.last_name = user.last_name or 'Smith'
        user.save(update_fields=['phone', 'membership_id', 'first_name', 'last_name'])

        self.stdout.write(f'Seeding payments for: {user.username} ({user.email})')

        books = list(Book.objects.prefetch_related('copies').all())
        if not books:
            self.stderr.write('No books found. Run seed_demo_data first.')
            return

        now = timezone.now()

        def random_paid_at(months_ago):
            base = now - timedelta(days=30 * months_ago)
            return base - timedelta(
                days=random.randint(0, 27),
                hours=random.randint(8, 20),
                minutes=random.randint(0, 59),
            )

        def realistic_amount():
            days = random.choice([1, 2, 2, 3, 3, 4, 5, 5, 7, 7, 10, 14])
            return Decimal(days * FINE_PER_DAY)

        created_payments = 0
        attempts = 0
        while created_payments < count and attempts < count * 4:
            attempts += 1
            months_ago = random.randint(0, 11)
            paid_at = random_paid_at(months_ago)
            book = random.choice(books)
            copy = book.copies.order_by('?').first()
            if not copy:
                continue

            due = paid_at - timedelta(days=random.randint(2, 20))
            issue = due - timedelta(days=random.randint(3, 30))
            bt = BorrowTransaction.objects.create(
                user=user,
                book_copy=copy,
                issue_date=issue,
                due_date=due,
                return_date=paid_at - timedelta(days=random.randint(0, 5)),
                status='returned',
                issued_by=user,
                returned_by=user,
            )
            amount = realistic_amount()
            fine = Fine.objects.create(transaction=bt, amount=amount, paid=True, paid_at=paid_at)
            payment = Payment.objects.create(
                user=user,
                fine=fine,
                amount=amount,
                method='mpesa',
                phone=user.phone or '0712345678',
                status='completed',
                receipt=f"MP{paid_at.strftime('%Y%m%d')}{random.randint(10000, 99999)}",
                completed_at=paid_at,
            )
            PaymentReceipt.objects.get_or_create(payment=payment)
            created_payments += 1

        unpaid_count = 0
        attempts = 0
        while unpaid_count < 3 and attempts < 12:
            attempts += 1
            book = random.choice(books)
            copy = book.copies.order_by('?').first()
            if not copy:
                continue
            due = now - timedelta(days=random.randint(2, 30))
            issue = due - timedelta(days=random.randint(3, 30))
            bt = BorrowTransaction.objects.create(
                user=user,
                book_copy=copy,
                issue_date=issue,
                due_date=due,
                status='overdue',
                issued_by=user,
            )
            Fine.objects.create(transaction=bt, amount=realistic_amount(), paid=False)
            unpaid_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {created_payments} completed payments and {unpaid_count} unpaid fines for {user.username}.'
        ))
