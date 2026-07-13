from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from books.models import Author, Book, BookCopy, Category, Publisher
from transactions.models import BorrowTransaction

User = get_user_model()


class BaseTestCase(TestCase):
    @classmethod
    def _setup_data(cls):
        if User.objects.exists():
            return
        for i in range(1, 21):
            User.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@example.com',
                password='testpass123',
            )
        publisher = Publisher.objects.create(name='Closure Press')
        author = Author.objects.create(name='Test Author', biography='Author bio')
        category = Category.objects.create(name='Test Category')
        for i in range(1, 21):
            book = Book.objects.create(
                title=f'Book {i}',
                isbn=f'9780000000{i:04d}',
                publisher=publisher,
            )
            book.authors.add(author)
            book.categories.add(category)
            BookCopy.objects.create(book=book, barcode=f'BC{i:05d}')

    @classmethod
    def setUpTestData(cls):
        cls._setup_data()

    @property
    def user_factory(self):
        def _make(**kwargs):
            defaults = {
                'username': kwargs.pop('username', f'user_{id(self)}'),
                'email': kwargs.pop('email', f'u{id(self)}@test.com'),
                'password': kwargs.pop('password', 'testpass123'),
            }
            defaults.update(kwargs)
            return User.objects.create_user(**defaults)
        return _make

    @property
    def book_copy_factory(self):
        def _make(**kwargs):
            book_kwargs = kwargs.pop('book', {})
            book_data = {
                'title': book_kwargs.pop('title', 'Test Book'),
                'isbn': book_kwargs.pop('isbn', f'9780999999{id(self) % 10000:04d}'),
            }
            publisher = book_kwargs.pop('publisher', Publisher.objects.first())
            if publisher is None:
                publisher = Publisher.objects.create(name='Test Publisher')
            book_data['publisher'] = publisher
            book_data.update(book_kwargs)
            book = Book.objects.create(**book_data)

            copy_defaults = {
                'barcode': kwargs.pop('barcode', f'BC{id(self)}'),
                'status': kwargs.pop('status', 'available'),
            }
            copy_defaults.update(kwargs)
            return BookCopy.objects.create(book=book, **copy_defaults)
        return _make

    @property
    def borrow_factory(self):
        def _make(**kwargs):
            user = kwargs.pop('user', User.objects.first())
            book_copy = kwargs.pop('book_copy', None)
            if book_copy is None:
                book_copy = self.book_copy_factory()
            defaults = {
                'user': user,
                'book_copy': book_copy,
                'issue_date': timezone.now() - timezone.timedelta(days=7),
                'due_date': timezone.now() + timezone.timedelta(days=7),
                'status': kwargs.pop('status', 'issued'),
                'return_date': kwargs.pop('return_date', None),
            }
            return BorrowTransaction.objects.create(**defaults)
        return _make
