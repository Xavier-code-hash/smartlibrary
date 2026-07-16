from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
import uuid
from .models import Book, BookCopy, Author, Category, Publisher
from .serializers import (
    BookListSerializer, BookDetailSerializer, BookWriteSerializer,
    AuthorSerializer, CategorySerializer, PublisherSerializer,
)
from .utils import generate_library_isbn, generate_qr_payload, render_qr_image


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.prefetch_related('authors', 'categories', 'copies').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categories__name', 'publication_year', 'publisher']
    search_fields = ['title', 'isbn', 'authors__name', 'publisher__name']
    ordering_fields = ['title', 'publication_year', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'qr', 'copies'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return BookListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return BookWriteSerializer
        return BookDetailSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        book = serializer.save()
        self._ensure_isbn(book)
        self._sync_copies(book)

    @transaction.atomic
    def perform_update(self, serializer):
        book = serializer.save()
        self._ensure_isbn(book)
        self._sync_copies(book)

    def _ensure_isbn(self, book):
        if not book.isbn:
            used = set(Book.objects.values_list('isbn', flat=True))
            isbn = generate_library_isbn(book)
            while isbn in used:
                isbn = generate_library_isbn(book)
                used.add(isbn)
            Book.objects.filter(pk=book.pk).update(isbn=isbn)
            book.isbn = isbn

    @action(detail=True, methods=['get'])
    def qr(self, request, pk=None):
        """Return the printable QR code (PNG) embedding the ISBN + library info."""
        book = self.get_object()
        payload = generate_qr_payload(book)
        _, raw = render_qr_image(payload)
        return HttpResponse(raw, content_type='image/png')

    @action(detail=True, methods=['get'])
    def copies(self, request, pk=None):
        """List the copies for a book (used to auto-fill manual borrow entry)."""
        book = self.get_object()
        from .serializers import BookCopySearchSerializer
        qs = book.copies.select_related('book').order_by('id')
        return Response(BookCopySearchSerializer(qs, many=True).data)

    def _sync_copies(self, book):
        desired = book.total_copies or 0
        current = book.copies.count()
        if current < desired:
            BookCopy.objects.bulk_create([
                BookCopy(
                    book=book,
                    barcode=f"COPY-{uuid.uuid4().hex[:12].upper()}",
                    status='available',
                )
                for _ in range(desired - current)
            ])
        elif current > desired:
            extra = current - desired
            removable = book.copies.filter(status='available').order_by('id')[:extra]
            BookCopy.objects.filter(pk__in=[c.pk for c in removable]).delete()


class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class PublisherViewSet(viewsets.ModelViewSet):
    queryset = Publisher.objects.all()
    serializer_class = PublisherSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
