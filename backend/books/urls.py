from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'authors', views.AuthorViewSet, basename='author')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'publishers', views.PublisherViewSet, basename='publisher')
router.register(r'', views.BookViewSet, basename='book')

urlpatterns = [
    path('', include(router.urls)),
]
