from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import BorrowTransaction

from core.email import send_overdue_reminder_email


def calculate_fine(transaction):
    if transaction.return_date and transaction.due_date:
        overdue_days = (transaction.return_date - transaction.due_date).days
        if overdue_days > 0:
            return overdue_days * 5
    return 0


@receiver(post_save, sender=BorrowTransaction)
def check_overdue(sender, instance, **kwargs):
    if instance.status == 'issued' and timezone.now() > instance.due_date:
        BorrowTransaction.objects.filter(pk=instance.pk).update(status='overdue')


@receiver(post_save, sender=BorrowTransaction)
def send_overdue_mail(sender, instance, created, **kwargs):
    if instance.status == 'overdue' and instance.return_date is None:
        send_overdue_reminder_email(instance.user, instance.book_copy.book.title)
