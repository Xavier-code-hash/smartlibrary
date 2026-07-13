from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.me, name='me'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('password-reset/request/', views.request_password_reset, name='password-reset-request'),
    path('password-reset/confirm/', views.reset_password, name='password-reset-confirm'),
]
