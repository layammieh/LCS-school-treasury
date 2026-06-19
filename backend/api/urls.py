from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'consignees', views.ConsigneeViewSet, basename='consignee')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'revenue-recipients', views.RevenueRecipientViewSet, basename='revenue-recipient')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.login_view, name='login'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/profile/', views.profile_view, name='profile'),
    path('auth/change-password/', views.change_password_view, name='change-password'),
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
]
