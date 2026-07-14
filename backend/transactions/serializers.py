from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import BorrowTransaction, Reservation, Fine, Payment

User = get_user_model()


def person_detail(user):
    if not user:
        return None
    full_name = f"{user.first_name} {user.last_name}".strip()
    return {
        'id': user.id,
        'username': user.username,
        'full_name': full_name or user.username,
        'email': user.email,
        'membership_id': getattr(user, 'membership_id', None),
        'phone': getattr(user, 'phone', ''),
        'role': user.role,
    }


class PersonSerializer(serializers.BaseSerializer):
    def to_representation(self, user):
        return person_detail(user)


class BorrowTransactionSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book_copy.book.title', read_only=True)
    book_copy_barcode = serializers.CharField(source='book_copy.barcode', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = BorrowTransaction
        fields = ['id', 'user', 'user_username', 'book_copy', 'book_title',
                   'book_copy_barcode', 'issue_date', 'due_date', 'return_date', 'status']
        read_only_fields = ['issue_date', 'status']


class BorrowHistorySerializer(serializers.ModelSerializer):
    borrower = PersonSerializer(source='user', read_only=True)
    issuer = PersonSerializer(source='issued_by', read_only=True)
    returner = PersonSerializer(source='returned_by', read_only=True)
    book = serializers.SerializerMethodField()
    fine = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)

    class Meta:
        model = BorrowTransaction
        fields = [
            'id', 'status', 'issue_date', 'due_date', 'return_date',
            'is_overdue', 'days_overdue', 'notes',
            'book', 'borrower', 'issuer', 'returner', 'fine',
        ]

    def get_book(self, obj):
        copy = obj.book_copy
        book = copy.book if copy else None
        authors = []
        if book:
            authors = [a.name for a in book.authors.all()]
        return {
            'book_id': book.id if book else None,
            'title': book.title if book else 'Unknown book',
            'isbn': book.isbn if book else None,
            'authors': authors,
            'copy_id': copy.id if copy else None,
            'barcode': copy.barcode if copy else None,
        }

    def get_fine(self, obj):
        fine = obj.fines.first()
        if not fine:
            return None
        return {
            'amount': fine.amount,
            'paid': fine.paid,
            'paid_at': fine.paid_at,
        }


class BorrowCreateSerializer(serializers.Serializer):
    book_copy = serializers.IntegerField()


class ReturnSerializer(serializers.Serializer):
    book_copy = serializers.IntegerField()


class ReservationSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)

    class Meta:
        model = Reservation
        fields = ['id', 'user', 'book', 'book_title', 'reserved_at', 'status', 'queue_position']
        read_only_fields = ['reserved_at', 'queue_position']


class FineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fine
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    fine_id = serializers.IntegerField(source='fine.id', read_only=True)
    book_title = serializers.SerializerMethodField()
    receipt_number = serializers.CharField(source='receipt_record.receipt_number', read_only=True)
    receipt_generated_at = serializers.DateTimeField(source='receipt_record.generated_at', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'username', 'full_name', 'fine_id', 'book_title',
            'amount', 'method', 'phone', 'status', 'receipt',
            'receipt_number', 'receipt_generated_at',
            'result_desc', 'created_at', 'completed_at',
        ]

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username

    def get_book_title(self, obj):
        fine = obj.fine
        if fine and fine.transaction and fine.transaction.book_copy:
            return fine.transaction.book_copy.book.title
        return 'Unknown'
