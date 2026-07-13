from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Notification


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'is_active']
    list_filter = ['role', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'address', 'date_of_birth', 'membership_id')}),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'message', 'read', 'created_at']
    list_filter = ['read', 'created_at']
