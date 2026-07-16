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

FINE_PER_DAY = 5  # must match transactions.signals.calculate_fine


def weighted_overdue_days():
    return random.choice([1, 2, 2, 3, 3, 4, 5, 5, 7, 7, 10, 14])


class Command(BaseCommand):
    help = 'Seed realistic, aligned revenue data (paid fines + M-Pesa payments) from existing members/books.'

    @transaction.atomic
    def handle(self, *args, **options):
        now = timezone.now()
        members = list(User.objects.filter(role='member'))
        if not members:
            self.stderr.write('No members found. Run seed_demo_data first.')
            return

        # Real copies that have been borrowed at some point give us plausible books.
        books = list(Book.objects.prefetch_related('copies').all())
        flagged = [m for m in members if getattr(m, 'has_return_issues', False)]
        normal = [m for m in members if not getattr(m, 'has_return_issues', False)]

        def realistic_amount():
            # KES 5/day * (1..14 days) -> 5..70, occasionally a larger one
            days = weighted_overdue_days()
            return Decimal(days * FINE_PER_DAY)

        def random_paid_at(months_ago):
            base = now - timedelta(days=30 * months_ago)
            return base - timedelta(days=random.randint(0, 27),
                                    hours=random.randint(8, 20),
                                    minutes=random.randint(0, 59))

        # ---- 1) Promote existing unpaid fines into paid revenue ----
        existing_unpaid = list(Fine.objects.filter(paid=False))
        for fine in existing_unpaid:
            months_ago = random.randint(0, 11)
            paid_at = random_paid_at(months_ago)
            fine.paid = True
            fine.paid_at = paid_at
            fine.save(update_fields=['paid', 'paid_at'])
            self._make_payment(fine, paid_at)

        # ---- 2) Add a realistic volume of paid fines across 12 months ----
        # Target roughly matches the documented monthly_revenue_plan (≈166 paid fines total).
        target_paid = 156  # + existing 10 already handled above
        created = 0
        attempts = 0
        while created < target_paid and attempts < target_paid * 4:
            attempts += 1
            months_ago = random.randint(0, 11)
            paid_at = random_paid_at(months_ago)
            # Repeat offenders generate more fines.
            member = random.choice(flagged) if (flagged and random.random() < 0.55) else random.choice(members)
            book = random.choice(books)
            copy = book.copies.order_by('?').first()
            if not copy:
                continue
            # Create a returned/overdue borrow so the fine has a real context.
            due = paid_at - timedelta(days=random.randint(2, 20))
            issue = due - timedelta(days=random.randint(3, 30))
            bt = BorrowTransaction.objects.create(
                user=member,
                book_copy=copy,
                issue_date=issue,
                due_date=due,
                return_date=paid_at - timedelta(days=random.randint(0, 5)),
                status='returned',
                issued_by=member,
                returned_by=member,
            )
            amount = realistic_amount()
            fine = Fine.objects.create(transaction=bt, amount=amount, paid=True, paid_at=paid_at)
            self._make_payment(fine, paid_at)
            created += 1

        # ---- 3) Leave a realistic number of UNPAID fines ----
        unpaid_target = max(8, int((created + len(existing_unpaid)) * 0.18))
        unpaid_made = 0
        attempts = 0
        while unpaid_made < unpaid_target and attempts < unpaid_target * 4:
            attempts += 1
            member = random.choice(members)
            book = random.choice(books)
            copy = book.copies.order_by('?').first()
            if not copy:
                continue
            bt = BorrowTransaction.objects.create(
                user=member,
                book_copy=copy,
                issue_date=now - timedelta(days=random.randint(20, 60)),
                due_date=now - timedelta(days=random.randint(2, 30)),
                status='overdue',
                issued_by=member,
            )
            Fine.objects.create(transaction=bt, amount=realistic_amount(), paid=False)
            unpaid_made += 1

        collected = sum(
            p.amount for p in Payment.objects.filter(status='completed')
        )
        self.stdout.write(self.style.SUCCESS(
            f'Revenue mockup applied. '
            f'Paid fines: {Fine.objects.filter(paid=True).count()}, '
            f'Unpaid fines: {Fine.objects.filter(paid=False).count()}, '
            f'Payments (completed): {Payment.objects.filter(status="completed").count()}, '
            f'Collected: KES {collected}'
        ))

    def _make_payment(self, fine, paid_at):
        phone = fine.transaction.user.phone or '0712345678'
        payment = Payment.objects.create(
            user=fine.transaction.user,
            fine=fine,
            amount=fine.amount,
            method='mpesa',
            phone=phone,
            status='completed',
            receipt=f"MP{paid_at.strftime('%Y%m%d')}{random.randint(10000, 99999)}",
            completed_at=paid_at,
        )
        PaymentReceipt.objects.get_or_create(payment=payment)
        return payment
