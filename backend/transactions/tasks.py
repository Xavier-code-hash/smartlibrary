from datetime import timedelta
from celery import shared_task
from django.utils import timezone

from core.email import send_overdue_reminder_email, send_due_date_reminder_email

from .models import BorrowTransaction


@shared_task(name='transactions.tasks.send_overdue_reminders')
def send_overdue_reminders():
    overdue = BorrowTransaction.objects.filter(
        status='overdue',
        return_date__isnull=True,
    )
    for txn in overdue:
        send_overdue_reminder_email(txn.user, txn.book_copy.book.title)


@shared_task(name='transactions.tasks.send_due_date_reminders')
def send_due_date_reminders():
    today = timezone.now().date()
    reminder_date = today + timedelta(days=2)
    upcoming = BorrowTransaction.objects.filter(
        status='issued',
        return_date__isnull=True,
        due_date__date=reminder_date,
    )
    for txn in upcoming:
        due_date_str = txn.due_date.strftime('%A, %B %d, %Y')
        send_due_date_reminder_email(txn.user, txn.book_copy.book.title, due_date_str)
