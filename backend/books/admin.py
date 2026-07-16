from django.contrib import admin
from .models import Book, BookCopy, Author, Category, Publisher


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'book_code', 'isbn', 'publisher', 'publication_year', 'year_purchased', 'edition', 'language', 'total_copies', 'available_copies']
    list_filter = ['categories', 'publication_year', 'year_purchased', 'language']
    search_fields = ['title', 'isbn', 'book_code', 'authors__name', 'publisher__name']
    filter_horizontal = ['authors', 'categories']
    readonly_fields = ['available_copies', 'book_code']
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'isbn', 'publisher', 'publication_year', 'year_purchased', 'edition', 'language', 'pages')
        }),
        ('Verification Code', {
            'fields': ('book_code',)
        }),
        ('Content', {
            'fields': ('description', 'cover', 'pdf')
        }),
        ('Inventory', {
            'fields': ('total_copies',)
        }),
        ('Classification', {
            'fields': ('authors', 'categories')
        }),
    )


@admin.register(BookCopy)
class BookCopyAdmin(admin.ModelAdmin):
    list_display = ['barcode', 'book', 'condition', 'status', 'acquired_at']
    list_filter = ['condition', 'status', 'acquired_at']
    search_fields = ['barcode', 'book__title', 'book__isbn', 'book__book_code']


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'birth_date']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'phone', 'email', 'website']
    search_fields = ['name']
    ordering = ['name']
