from rest_framework import serializers
from .models import Consignee, Transaction, Expense, RevenueRecipient, Liquidation


class ConsigneeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consignee
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make user field optional during validation (it will be set in perform_create)
        self.fields['user'].required = False
        self.fields['school_year'].required = False


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make user field optional during validation (it will be set in perform_create)
        self.fields['user'].required = False


class RevenueRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueRecipient
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['user'].required = False
        self.fields['school_year'].required = False

class LiquidationSerializer(serializers.ModelSerializer):
    income = serializers.SerializerMethodField()
    expenses = serializers.SerializerMethodField()

    class Meta:
        model = Liquidation
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['user'].required = False
        self.fields['school_year'].required = False

    def get_income(self, obj):
        from django.db.models import Sum
        try:
            year, month = obj.month.split('-')
            total = Transaction.objects.filter(
                user=obj.user,
                school_year=obj.school_year,
                transaction_type='collection',
                status='paid',
                date__year=int(year),
                date__month=int(month)
            ).exclude(category__icontains='coconut').aggregate(total=Sum('amount'))['total']
            return total or 0
        except Exception:
            return 0

    def get_expenses(self, obj):
        from django.db.models import Sum
        try:
            year, month = obj.month.split('-')
            total = Expense.objects.filter(
                user=obj.user,
                school_year=obj.school_year,
                date__year=int(year),
                date__month=int(month)
            ).exclude(name__icontains='coconut').aggregate(total=Sum('amount'))['total']
            return total or 0
        except Exception:
            return 0
