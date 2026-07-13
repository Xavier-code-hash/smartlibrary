from rest_framework import serializers
from .models import BorrowTransaction, Reservation, Fine


class BorrowTransactionSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book_copy.book.title', read_only=True)
    book_copy_barcode = serializers.CharField(source='book_copy.barcode', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = BorrowTransaction
        fields = ['id', 'user', 'user_username', 'book_copy', 'book_title',
                   'book_copy_barcode', 'issue_date', 'due_date', 'return_date', 'status']
        read_only_fields = ['issue_date', 'status']


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
