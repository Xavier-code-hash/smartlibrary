from django.db import models
from django.core.exceptions import ValidationError

from .utils import normalize_isbn, is_valid_isbn, generate_isbn13


class Author(models.Model):
    name = models.CharField(max_length=255)
    biography = models.TextField(blank=True)
    birth_date = models.DateField(null=True, blank=True)
    code = models.CharField(
        max_length=4, blank=True, unique=True, db_index=True,
        help_text='Library-assigned unique 2-char code (letter + number) used in the book code.',
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.code:
            from .utils import assign_author_code
            self.code = assign_author_code(self.name)
        super().save(*args, **kwargs)


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Publisher(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(
        max_length=4, blank=True, unique=True, db_index=True,
        help_text='Library-assigned unique letter code for the publisher (used in the book code).',
    )
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.code:
            from .utils import assign_publisher_code
            self.code = assign_publisher_code(self)
        super().save(*args, **kwargs)


class Book(models.Model):
    title = models.CharField(max_length=255)
    isbn = models.CharField(max_length=17, unique=True, db_index=True, help_text='ISBN-10 or ISBN-13 (hyphens optional)')
    authors = models.ManyToManyField(Author, related_name='books')
    categories = models.ManyToManyField(Category, related_name='books')
    publisher = models.ForeignKey(Publisher, on_delete=models.SET_NULL, null=True, blank=True)
    publication_year = models.PositiveIntegerField(null=True, blank=True)
    year_purchased = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Year the library acquired/purchased the book (used in the book code).',
    )
    edition = models.CharField(max_length=100, blank=True, help_text='e.g. 1st, 2nd, Revised')
    language = models.CharField(max_length=50, default='English', blank=True)
    pages = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    cover = models.ImageField(upload_to='covers/', blank=True)
    pdf = models.FileField(upload_to='pdfs/', blank=True)
    total_copies = models.PositiveIntegerField(default=1)
    book_code = models.CharField(
        max_length=64, blank=True, db_index=True,
        help_text='Library verification code printed on the book to avoid manual entry.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['isbn']),
            models.Index(fields=['publication_year']),
            models.Index(fields=['book_code']),
        ]
        ordering = ['title']

    def __str__(self):
        return f"{self.title} ({self.isbn})"

    def clean(self):
        if self.isbn:
            normalized = normalize_isbn(self.isbn)
            if not is_valid_isbn(normalized):
                raise ValidationError({'isbn': 'Enter a valid ISBN-10 or ISBN-13.'})

    def save(self, *args, **kwargs):
        if self.isbn:
            self.isbn = normalize_isbn(self.isbn)
        super().save(*args, **kwargs)
        from .utils import generate_book_code
        code = generate_book_code(self)
        if code and code != self.book_code:
            self.book_code = code
            save_kwargs = {k: v for k, v in kwargs.items() if k not in ('force_insert', 'force_update', 'update_fields')}
            update_fields = list(kwargs.get('update_fields') or [])
            update_fields.append('book_code')
            super().save(update_fields=update_fields, **save_kwargs)

    @property
    def available_copies(self):
        return self.copies.filter(status='available').count()


class BookCopy(models.Model):
    CONDITION_CHOICES = (
        ('new', 'New'),
        ('good', 'Good'),
        ('damaged', 'Damaged'),
        ('lost', 'Lost'),
    )
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('issued', 'Issued'),
        ('damaged', 'Damaged'),
        ('lost', 'Lost'),
        ('reserved', 'Reserved'),
    )
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='copies')
    barcode = models.CharField(max_length=100, unique=True, blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='new')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    acquired_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['book__title', 'id']

    def __str__(self):
        return f"Copy {self.barcode or self.id} of {self.book.title} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.barcode and self.book_id:
            from .utils import generate_barcode
            existing_count = self.book.copies.count()
            self.barcode = generate_barcode(self.book.title, self.book.id, existing_count + 1)
        super().save(*args, **kwargs)
