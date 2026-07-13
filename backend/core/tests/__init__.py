from django.core import mail
from django.utils import timezone
from django.test import override_settings

from .base_test import BaseTestCase


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@closure.local',
)
class EmailTests(BaseTestCase):
    def test_registration_sends_welcome_email(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'testpass123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        welcome_emails = [m for m in mail.outbox if m.subject == 'Welcome to Closure Library']
        self.assertEqual(len(welcome_emails), 1)
        self.assertIn('newuser@example.com', welcome_emails[0].to)

    def test_password_reset_sends_reset_email(self):
        user = self.user_factory(email='existing@example.com')
        self.client.post(
            '/api/auth/password-reset/request/',
            {'email': 'existing@example.com'},
            format='json',
        )
        reset_emails = [m for m in mail.outbox if m.subject == 'Password Reset Request']
        self.assertEqual(len(reset_emails), 1)
        self.assertIn('existing@example.com', reset_emails[0].to)

    def test_overdue_status_triggers_reminder_signal(self):
        book_copy = self.book_copy_factory(status='available')
        txn = self.borrow_factory(
            book_copy=book_copy,
            status='overdue',
            issue_date=timezone.now() - timezone.timedelta(days=30),
            due_date=timezone.now() - timezone.timedelta(days=20),
            return_date=None,
        )
        mail.outbox.clear()
        txn.save()
        overdue_emails = [m for m in mail.outbox if m.subject == 'Overdue Book Reminder']
        self.assertEqual(len(overdue_emails), 1)
        self.assertIn(txn.user.email, overdue_emails[0].to)

    def test_returned_transaction_does_not_trigger_reminder(self):
        book_copy = self.book_copy_factory(status='available')
        txn = self.borrow_factory(
            book_copy=book_copy,
            status='returned',
            return_date=timezone.now(),
        )
        txn.save()
        overdue_emails = [m for m in mail.outbox if m.subject == 'Overdue Book Reminder']
        self.assertEqual(len(overdue_emails), 0)
