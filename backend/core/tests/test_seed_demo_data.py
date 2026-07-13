from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from books.models import Book, BookCopy
from core.models import Notification
from transactions.models import BorrowTransaction


class SeedDemoDataCommandTests(TestCase):
    def test_seed_demo_data_creates_demo_content(self):
        out = StringIO()

        call_command('seed_demo_data', stdout=out)

        self.assertIn('Seeded demo data successfully.', out.getvalue())

        User = get_user_model()
        self.assertTrue(User.objects.filter(username='admin').exists())
        self.assertGreaterEqual(User.objects.count(), 50)
        self.assertGreaterEqual(Book.objects.count(), 50)
        self.assertGreaterEqual(BookCopy.objects.count(), 80)
        self.assertGreaterEqual(BorrowTransaction.objects.count(), 1)
        self.assertGreaterEqual(Notification.objects.count(), 3)
