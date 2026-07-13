from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import CustomUser, Notification, PasswordResetToken
from .email import send_welcome_email, send_password_reset_email

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'phone', 'address', 'date_of_birth', 'membership_id']
        read_only_fields = ['id']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'role', 'phone', 'address']

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        send_welcome_email(user)
        return user


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class RequestPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        email = self.validated_data['email']
        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            reset_token = PasswordResetToken.objects.create(user=user)
            reset_link = f"{settings.FRONTEND_BASE_URL}/reset-password?token={reset_token.token}"
            send_password_reset_email(user, reset_link)
        return {'detail': 'If an account with that email exists, a password reset link has been sent.'}


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password2']:
            raise serializers.ValidationError({'new_password2': 'Passwords do not match.'})
        try:
            reset_token = PasswordResetToken.objects.get(token=data['token'])
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({'token': 'Invalid or expired reset token.'})
        if not reset_token.is_valid():
            raise serializers.ValidationError({'token': 'Invalid or expired reset token.'})
        return data

    def save(self):
        token_value = self.validated_data['token']
        new_password = self.validated_data['new_password']
        reset_token = PasswordResetToken.objects.get(token=token_value)
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        reset_token.used = True
        reset_token.save()
        return {'detail': 'Password has been reset successfully.'}
