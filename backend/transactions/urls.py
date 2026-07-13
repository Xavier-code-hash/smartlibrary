from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'borrow', views.BorrowViewSet, basename='borrow')
router.register(r'reservations', views.ReservationViewSet, basename='reservation')
router.register(r'fines', views.FineViewSet, basename='fine')

urlpatterns = [
    path('', include(router.urls)),
]
