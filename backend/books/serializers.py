from rest_framework import serializers
from .models import Book, BookCopy, Author, Category, Publisher


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = '__all__'


class BookCopySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookCopy
        fields = '__all__'


class BookCopySearchSerializer(serializers.ModelSerializer):
    book = serializers.SerializerMethodField()

    class Meta:
        model = BookCopy
        fields = ['id', 'barcode', 'condition', 'status', 'book']

    def get_book(self, obj):
        return {
            'id': obj.book.id,
            'title': obj.book.title,
            'isbn': obj.book.isbn,
        } if obj.book else None


class BookListSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True, read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    available_copies = serializers.IntegerField(read_only=True)

    class Meta:
        model = Book
        fields = ['id', 'title', 'isbn', 'authors', 'categories', 'publisher',
                   'publication_year', 'cover', 'available_copies', 'total_copies']


class BookDetailSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True, read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    publisher = PublisherSerializer(read_only=True)
    copies = BookCopySerializer(many=True, read_only=True)
    available_copies = serializers.IntegerField(read_only=True)

    class Meta:
        model = Book
        fields = '__all__'


class BookWriteSerializer(serializers.ModelSerializer):
    authors = serializers.PrimaryKeyRelatedField(queryset=Author.objects.all(), many=True)
    categories = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), many=True)

    class Meta:
        model = Book
        fields = '__all__'
