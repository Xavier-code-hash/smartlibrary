from django.db import models


class Author(models.Model):
    name = models.CharField(max_length=255)
    biography = models.TextField(blank=True)
    birth_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Publisher(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.name


class Book(models.Model):
    title = models.CharField(max_length=255)
    isbn = models.CharField(max_length=13, unique=True, db_index=True)
    authors = models.ManyToManyField(Author, related_name='books')
    categories = models.ManyToManyField(Category, related_name='books')
    publisher = models.ForeignKey(Publisher, on_delete=models.SET_NULL, null=True, blank=True)
    publication_year = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    cover = models.ImageField(upload_to='covers/', blank=True)
    pdf = models.FileField(upload_to='pdfs/', blank=True)
    total_copies = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['isbn']),
        ]

    def __str__(self):
        return f"{self.title} ({self.isbn})"

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
    )
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='copies')
    barcode = models.CharField(max_length=100, unique=True, blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='new')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')

    def __str__(self):
        return f"Copy {self.barcode} of {self.book.title} ({self.get_status_display()})"
