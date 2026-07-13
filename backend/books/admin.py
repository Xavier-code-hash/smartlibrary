from django.contrib import admin
from .models import Book, BookCopy, Author, Category, Publisher


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'isbn', 'publisher', 'publication_year', 'total_copies']
    list_filter = ['categories', 'publication_year']
    search_fields = ['title', 'isbn', 'authors__name']
    filter_horizontal = ['authors', 'categories']


@admin.register(BookCopy)
class BookCopyAdmin(admin.ModelAdmin):
    list_display = ['barcode', 'book', 'condition', 'status']
    list_filter = ['condition', 'status']
    search_fields = ['barcode', 'book__title']


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['name', 'birth_date']
    search_fields = ['name']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']


@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone']
