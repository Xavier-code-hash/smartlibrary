from celery import shared_task

from core.email import send_overdue_reminder_email

from .models import BorrowTransaction


@shared_task(name='transactions.tasks.send_overdue_reminders')
def send_overdue_reminders():
    overdue = BorrowTransaction.objects.filter(
        status='overdue',
        return_date__isnull=True,
    )
    for txn in overdue:
        send_overdue_reminder_email(txn.user, txn.book_copy.book.title)
