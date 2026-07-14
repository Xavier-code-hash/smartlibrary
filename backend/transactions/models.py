from django.db import models
from django.conf import settings
from django.utils import timezone
from books.models import Book, BookCopy
import random
import string


def generate_receipt_number():
    date = timezone.now().strftime('%Y%m%d')
    rand = ''.join(random.choices(string.digits, k=5))
    return f"RCP-{date}-{rand}"


class BorrowTransaction(models.Model):
    STATUS_CHOICES = (
        ('issued', 'Issued'),
        ('returned', 'Returned'),
        ('overdue', 'Overdue'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='borrows')
    book_copy = models.ForeignKey(BookCopy, on_delete=models.CASCADE, related_name='transactions')
    issue_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    return_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='issued_transactions',
    )
    returned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='returned_transactions',
    )
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['issue_date']),
        ]
        ordering = ['-issue_date']

    @property
    def is_overdue(self):
        if self.status in ('issued', 'overdue') and self.due_date:
            return self.due_date < timezone.now()
        return False

    @property
    def days_overdue(self):
        if self.return_date and self.due_date:
            return max(0, (self.return_date - self.due_date).days)
        if self.is_overdue:
            return max(0, (timezone.now() - self.due_date).days)
        return 0

    def __str__(self):
        return f"{self.user.username} - {self.book_copy.book.title} ({self.get_status_display()})"


class Reservation(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('fulfilled', 'Fulfilled'),
        ('cancelled', 'Cancelled'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations')
    reserved_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    queue_position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['queue_position']

    def __str__(self):
        return f"{self.user.username} reserved {self.book.title}"


class Fine(models.Model):
    transaction = models.ForeignKey(BorrowTransaction, on_delete=models.CASCADE, related_name='fines')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Fine ${self.amount} for {self.transaction}"


class Payment(models.Model):
    METHOD_CHOICES = (
        ('mpesa', 'M-Pesa'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    fine = models.ForeignKey(Fine, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='mpesa')
    phone = models.CharField(max_length=20)
    checkout_request_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    merchant_request_id = models.CharField(max_length=255, blank=True, null=True)
    receipt = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result_desc = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} - {self.user.username} - KES {self.amount} ({self.status})"


class PaymentReceipt(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='receipt_record')
    receipt_number = models.CharField(max_length=40, unique=True, default=generate_receipt_number)
    generated_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"Receipt {self.receipt_number}"
