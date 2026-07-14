from django.db import models
from django.contrib.auth.models import User
import django.utils.timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True, default="")
    avatar = models.URLField(blank=True, null=True, default=None)

    def __str__(self):
        return f"{self.user.username}'s Profile"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class Consignee(models.Model):
    """Canteen vendors / consignees in the school."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consignees', null=True, blank=True)
    school_year = models.CharField(max_length=20, default='2026-2027', db_index=True)
    vendor_name = models.CharField(max_length=200)
    stall_no = models.CharField(max_length=20, blank=True, null=True)
    contact_person = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    date_registered = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_registered']

    def __str__(self):
        return f"{self.vendor_name} ({self.stall_no if self.stall_no else 'No Stall'})"


class Transaction(models.Model):
    """
    Unified transaction record covering both:
    - Fee collections (type='collection'): student payments
    - Ledger entries (type='ledger'): general debit/credit entries
    """

    TYPE_CHOICES = [
        ('collection', 'Collection'),
        ('ledger', 'Ledger'),
    ]

    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('unpaid', 'Unpaid'),
        ('overdue', 'Overdue'),
        ('pending', 'Pending'),
    ]


    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions', null=True, blank=True)
    school_year = models.CharField(max_length=20, default='2026-2027')
    canteen = models.CharField(
        max_length=20,
        choices=[('Canteen 1', 'Canteen 1'), ('Canteen 2', 'Canteen 2'), ('External', 'External')],
        default='Canteen 1',
        db_index=True
    )
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='collection')

    # Collection-specific fields
    student_name = models.CharField(max_length=200, blank=True, null=True)
    student_initials = models.CharField(max_length=5, blank=True, null=True)
    grade_section = models.CharField(max_length=100, blank=True, null=True)
    id_number = models.CharField(max_length=50, blank=True, null=True)

    # Ledger-specific fields
    description = models.TextField(blank=True, null=True)
    debit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    credit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    running_balance = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    # Common fields
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    category = models.CharField(max_length=50, default='General')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unpaid')
    date = models.DateField()
    time = models.TimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        if self.transaction_type == 'collection':
            return f"{self.student_name} - {self.amount} ({self.status})"
        return f"Ledger: {self.description} ({self.date})"





class Expense(models.Model):
    """Records expenses made by the school treasurer."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    school_year = models.CharField(max_length=20, default='2026-2027', db_index=True)
    name = models.CharField(max_length=200)
    requested_by = models.CharField(max_length=200, blank=True, null=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    date = models.DateField()
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.name} - {self.amount} ({self.date})"


class RevenueRecipient(models.Model):
    """Revenue distribution recipients configured on the Revenue page."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='revenue_recipients', null=True, blank=True)
    school_year = models.CharField(max_length=20, default='2026-2027', db_index=True)
    name = models.CharField(max_length=200)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    icon = models.CharField(max_length=50, default='GraduationCap')
    color = models.CharField(max_length=50, default='[#4ADE80]')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.name} ({self.percentage}%)"

class Liquidation(models.Model):
    """Monthly liquidation report summary tracking cash deposit/withdrawn and remarks."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='liquidations', null=True, blank=True)
    school_year = models.CharField(max_length=20, default='2026-2027', db_index=True)
    month = models.CharField(max_length=7, db_index=True) # Format: "YYYY-MM"
    cash_deposit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cash_withdrawn = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['month']
        unique_together = ['user', 'school_year', 'month']

    def __str__(self):
        return f"Liquidation {self.month} ({self.school_year})"

class CashOnBank(models.Model):
    """Stores the user-entered 'Cash on Bank' amount per school year."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cash_on_bank', null=True, blank=True)
    school_year = models.CharField(max_length=20, default='2026-2027', db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    date = models.DateField(default=django.utils.timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CashOnBank {self.school_year}: {self.amount}"


class CashReturn(models.Model):
    """Stores the user-entered 'Cash Return' (coconut) amount per school year.
    Cash returns are added on top of the coconut balance."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cash_return', null=True, blank=True)
    school_year = models.CharField(max_length=20, default='2026-2027', db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    date = models.DateField(default=django.utils.timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-updated_at']

    def __str__(self):
        return f"CashReturn {self.school_year}: {self.amount}"

# trigger github desktop
