from rest_framework import serializers
from .models import Book, BookCopy, Author, Category, Publisher
from .utils import normalize_isbn, is_valid_isbn


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name', 'biography', 'birth_date', 'code']
        read_only_fields = ['code']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = ['id', 'name', 'code', 'address', 'phone', 'email', 'website']
        read_only_fields = ['code']


class BookCopySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookCopy
        fields = '__all__'
        read_only_fields = ['barcode']


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
                   'publication_year', 'year_purchased', 'cover', 'available_copies', 'total_copies']


class BookDetailSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True, read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    publisher = PublisherSerializer(read_only=True)
    copies = BookCopySerializer(many=True, read_only=True)
    available_copies = serializers.IntegerField(read_only=True)
    qr_payload = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = '__all__'

    def get_qr_payload(self, obj):
        from .utils import generate_qr_payload
        return generate_qr_payload(obj)


class BookWriteSerializer(serializers.ModelSerializer):
    authors = serializers.PrimaryKeyRelatedField(queryset=Author.objects.all(), many=True)
    categories = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), many=True)

    class Meta:
        model = Book
        fields = '__all__'
        extra_kwargs = {
            'isbn': {'required': False, 'allow_blank': True},
            'year_purchased': {'required': False},
        }

    def validate_isbn(self, value):
        if not value:
            return ''
        normalized = normalize_isbn(value)
        if not is_valid_isbn(normalized):
            raise serializers.ValidationError('Enter a valid ISBN-10 or ISBN-13.')
        qs = Book.objects.filter(isbn=normalized)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A book with this ISBN already exists.')
        return normalized
