from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'borrow', views.BorrowViewSet, basename='borrow')
router.register(r'reservations', views.ReservationViewSet, basename='reservation')
router.register(r'fines', views.FineViewSet, basename='fine')
router.register(r'payments', views.PaymentViewSet, basename='payment')

urlpatterns = [
    path('fines/pay/', views.PayFineView.as_view(), name='fine-pay'),
    path('mpesa/callback/', views.MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('', include(router.urls)),
]
