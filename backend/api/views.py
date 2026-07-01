from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.contrib.auth import authenticate
from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.contrib.auth import authenticate
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import Consignee, Transaction, Expense, RevenueRecipient, Liquidation
from .serializers import ConsigneeSerializer, TransactionSerializer, ExpenseSerializer, RevenueRecipientSerializer, LiquidationSerializer


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'error': 'Please provide both username and password.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.contrib.auth.models import User
    # Find the user by username or email
    user_obj = User.objects.filter(Q(username=username) | Q(email=username)).first()
    if user_obj is None:
        return Response(
            {'error': 'User does not exist. Please register first.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    user = authenticate(request, username=user_obj.username, password=password)
    if user is None:
        return Response(
            {'error': 'Incorrect password. Please try again.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from .models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=user)

    token, created = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'username': user.username,
        'email': user.email,
        'full_name': user.get_full_name() or user.username,
        'bio': profile.bio,
        'avatar': profile.avatar,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    full_name = request.data.get('fullName', '').strip()

    if not username or not password or not email:
        return Response(
            {'error': 'Please provide username, email, and password.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.contrib.auth.models import User
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username is already taken.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email is already registered.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    names = full_name.split(' ', 1)
    first_name = names[0] if len(names) > 0 else ""
    last_name = names[1] if len(names) > 1 else ""

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )

    from .models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=user)
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'username': user.username,
        'email': user.email,
        'full_name': user.get_full_name() or user.username,
        'bio': profile.bio,
        'avatar': profile.avatar,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'detail': 'Logged out successfully.'})


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user
    from .models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'GET':
        return Response({
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name() or user.username,
            'bio': profile.bio,
            'avatar': profile.avatar,
        })

    # For POST / PUT
    data = request.data
    full_name = data.get('full_name', '')
    bio = data.get('bio', '')
    avatar_file = request.FILES.get('avatar')

    if full_name:
        names = full_name.split(' ', 1)
        user.first_name = names[0] if len(names) > 0 else ""
        user.last_name = names[1] if len(names) > 1 else ""
        user.save()

    if bio:
        profile.bio = bio

    if avatar_file:
        import cloudinary
        import cloudinary.uploader
        import os
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
        )
        upload_result = cloudinary.uploader.upload(
            avatar_file,
            folder='LCS_treasury',
            resource_type='image',
        )
        profile.avatar = upload_result.get('secure_url')

    profile.save()

    return Response({
        'username': user.username,
        'email': user.email,
        'full_name': user.get_full_name() or user.username,
        'bio': profile.bio,
        'avatar': profile.avatar,
    })



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    user = request.user
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not new_password or not confirm_password:
        return Response({'error': 'Please provide both new password and confirmation.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Password updated successfully.'})


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    school_year = request.query_params.get('school_year', '2026-2027')
    canteen = request.query_params.get('canteen')
    month_filter = request.query_params.get('month')  # e.g. "2026-06"

    collections = Transaction.objects.filter(transaction_type='collection', user=request.user, school_year=school_year)
    if canteen:
        collections = collections.filter(canteen=canteen)
    if month_filter:
        parts = month_filter.split('-')
        if len(parts) == 2:
            collections = collections.filter(date__year=parts[0], date__month=parts[1])

    from django.utils import timezone
    from datetime import timedelta
    import calendar

    one_week_ago = timezone.now().date() - timedelta(days=7)

    total_collected = collections.filter(status='paid').exclude(category__icontains='coconut').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')

    outstanding = collections.filter(
        status__in=['unpaid', 'pending', 'partial'],
        date__gt=one_week_ago
    ).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')

    expenses_qs = Expense.objects.filter(user=request.user, school_year=school_year)
    if month_filter:
        parts = month_filter.split('-')
        if len(parts) == 2:
            expenses_qs = expenses_qs.filter(date__year=parts[0], date__month=parts[1])
    total_expenses = expenses_qs.exclude(name__icontains='coconut').aggregate(total=Sum('amount'))['total'] or Decimal('0')

    available_balance = total_collected - total_expenses

    # Monthly chart data (12 months of the school year, Jan to Dec)
    start_year = 2026
    try:
        parts = school_year.split('-')
        if len(parts) == 2:
            start_year = int(parts[0])
    except Exception:
        pass

    months_data = []
    for month in range(1, 13):
        year = start_year
        month_label = calendar.month_abbr[month]

        month_revenue_qs = Transaction.objects.filter(
            transaction_type='ledger',
            credit__isnull=False,
            date__year=year,
            date__month=month,
            user=request.user,
            school_year=school_year,
        )
        if canteen:
            month_revenue_qs = month_revenue_qs.filter(canteen=canteen)
        month_revenue = month_revenue_qs.aggregate(total=Sum('credit'))['total'] or Decimal('0')

        month_collections_qs = Transaction.objects.filter(
            transaction_type='collection',
            status='paid',
            date__year=year,
            date__month=month,
            user=request.user,
            school_year=school_year,
        )
        if canteen:
            month_collections_qs = month_collections_qs.filter(canteen=canteen)
        month_collections = month_collections_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')

        month_expenses_qs = Expense.objects.filter(
            date__year=year,
            date__month=month,
            user=request.user,
            school_year=school_year,
        )
        month_expenses = month_expenses_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')

        months_data.append({
            'month': month_label,
            'revenue': float(month_revenue + month_collections),
            'expenses': float(month_expenses),
        })

    # Recent transactions (last 5)
    recent_txns_qs = Transaction.objects.filter(
        transaction_type='collection',
        user=request.user,
        school_year=school_year
    )
    if canteen:
        recent_txns_qs = recent_txns_qs.filter(canteen=canteen)
    if month_filter:
        parts = month_filter.split('-')
        if len(parts) == 2:
            recent_txns_qs = recent_txns_qs.filter(date__year=parts[0], date__month=parts[1])
    recent_txns = recent_txns_qs.order_by('-date', '-created_at')[:5]
    recent_data = TransactionSerializer(recent_txns, many=True).data

    coconut_collections = Transaction.objects.filter(transaction_type='collection', user=request.user, school_year=school_year, category__icontains='coconut')
    if month_filter:
        parts = month_filter.split('-')
        if len(parts) == 2:
            coconut_collections = coconut_collections.filter(date__year=parts[0], date__month=parts[1])
            
    total_coconut_collections = coconut_collections.filter(status='paid').aggregate(total=Sum('amount'))['total'] or Decimal('0')

    coconut_expenses_qs = Expense.objects.filter(user=request.user, school_year=school_year, name__icontains='coconut')
    if month_filter:
        parts = month_filter.split('-')
        if len(parts) == 2:
            coconut_expenses_qs = coconut_expenses_qs.filter(date__year=parts[0], date__month=parts[1])
    total_coconut_expenses = coconut_expenses_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    coconut_balance = total_coconut_collections - total_coconut_expenses

    return Response({
        'total_collections': float(total_collected),
        'outstanding_fees': float(outstanding),
        'total_expenses': float(total_expenses),
        'available_balance': float(available_balance),
        'total_coconut_collections': float(total_coconut_collections),
        'total_coconut_expenses': float(total_coconut_expenses),
        'coconut_balance': float(coconut_balance),
        'monthly_chart': months_data,
        'recent_transactions': recent_data,
    })


# ---------------------------------------------------------------------------
# Consignees
# ---------------------------------------------------------------------------

class ConsigneeViewSet(viewsets.ModelViewSet):
    queryset = Consignee.objects.all()
    serializer_class = ConsigneeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().filter(user=self.request.user)
        school_year = self.request.query_params.get('school_year')
        if school_year:
            qs = qs.filter(school_year=school_year)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(vendor_name__icontains=search) |
                Q(contact_person__icontains=search) |
                Q(phone__icontains=search) |
                Q(stall_no__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # Cascade vendor rename: update student_name on all matching transactions
        old_name = self.get_object().vendor_name
        instance = serializer.save()
        new_name = instance.vendor_name
        if old_name != new_name:
            Transaction.objects.filter(
                user=self.request.user,
                student_name=old_name
            ).update(
                student_name=new_name,
                student_initials=new_name.split()[0][0].upper() + (new_name.split()[1][0].upper() if len(new_name.split()) > 1 else '')
            )


# ---------------------------------------------------------------------------
# Transactions / Collections
# ---------------------------------------------------------------------------

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().filter(user=self.request.user)
        school_year = self.request.query_params.get('school_year')
        if school_year:
            qs = qs.filter(school_year=school_year)
        canteen = self.request.query_params.get('canteen')
        if canteen:
            qs = qs.filter(canteen=canteen)
        txn_type = self.request.query_params.get('type')
        if txn_type:
            qs = qs.filter(transaction_type=txn_type)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        date_filter = self.request.query_params.get('date')
        if date_filter:
            qs = qs.filter(date=date_filter)
        month_filter = self.request.query_params.get('month')
        if month_filter:
            parts = month_filter.split('-')
            if len(parts) == 2:
                qs = qs.filter(date__year=parts[0], date__month=parts[1])
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(student_name__icontains=search) |
                Q(id_number__icontains=search) |
                Q(description__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except Exception as e:
            err_str = str(e)
            # Auto-fix stale PostgreSQL sequence and retry once
            if 'duplicate key value violates unique constraint' in err_str and 'pkey' in err_str:
                from django.core.management.color import no_style
                from django.db import connection
                sequence_sql = connection.ops.sequence_reset_sql(no_style(), [Transaction])
                with connection.cursor() as cursor:
                    for sql in sequence_sql:
                        cursor.execute(sql)
                retry_serializer = self.get_serializer(data=request.data)
                retry_serializer.is_valid(raise_exception=True)
                try:
                    retry_serializer.save(user=request.user)
                except Exception as e2:
                    return Response({'error': str(e2)}, status=400)
                headers = self.get_success_headers(retry_serializer.data)
                return Response(retry_serializer.data, status=201, headers=headers)
            return Response({'error': err_str}, status=400)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='bulk-paid')
    def bulk_paid(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        school_year = request.query_params.get('school_year')
        canteen = request.query_params.get('canteen')
        query = Transaction.objects.filter(
            id__in=ids, transaction_type='collection', user=request.user
        )
        if school_year:
            query = query.filter(school_year=school_year)
        if canteen:
            query = query.filter(canteen=canteen)
        updated = query.update(status='paid')
        return Response({'updated': updated})

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        school_year = request.query_params.get('school_year')
        canteen = request.query_params.get('canteen')
        query = Transaction.objects.filter(
            id__in=ids, transaction_type='collection', user=request.user
        )
        if school_year:
            query = query.filter(school_year=school_year)
        if canteen:
            query = query.filter(canteen=canteen)
        deleted, _ = query.delete()
        return Response({'deleted': deleted})

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        qs = Transaction.objects.filter(transaction_type='collection', user=request.user)
        school_year = request.query_params.get('school_year')
        if school_year:
            qs = qs.filter(school_year=school_year)
        canteen = request.query_params.get('canteen')
        if canteen:
            qs = qs.filter(canteen=canteen)
        date_filter = request.query_params.get('date')
        month_filter = request.query_params.get('month')
        if date_filter:
            qs = qs.filter(date=date_filter)
        if month_filter:
            parts = month_filter.split('-')
            if len(parts) == 2:
                qs = qs.filter(date__year=parts[0], date__month=parts[1])

        from django.utils import timezone
        from datetime import timedelta

        one_week_ago = timezone.now().date() - timedelta(days=7)

        total_collected = qs.filter(status='paid').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')

        total_canteen = qs.filter(status='paid').exclude(category__icontains='coconut').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
            
        total_coconut = qs.filter(status='paid', category__icontains='coconut').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
            
        outstanding = qs.filter(
            status__in=['unpaid', 'partial', 'pending'],
            date__gt=one_week_ago
        ).aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
            
        overdue_qs = qs.filter(
            Q(status='overdue') | 
            Q(status__in=['unpaid', 'partial', 'pending'], date__lte=one_week_ago)
        )
        overdue_count = overdue_qs.count()
        
        total_count = qs.count()
        paid_count = qs.filter(status='paid').count()
        efficiency = round(paid_count / total_count * 100, 1) if total_count else 0

        return Response({
            'total_collected': float(total_collected),
            'total_canteen': float(total_canteen),
            'total_coconut': float(total_coconut),
            'outstanding': float(outstanding),
            'overdue_count': overdue_count,
            'efficiency': efficiency,
        })

    @action(detail=False, methods=['get'], url_path='ledger-summary')
    def ledger_summary(self, request):
        qs = Transaction.objects.filter(transaction_type='ledger', user=request.user)
        school_year = request.query_params.get('school_year')
        if school_year:
            qs = qs.filter(school_year=school_year)
        canteen = request.query_params.get('canteen')
        if canteen:
            qs = qs.filter(canteen=canteen)
        total_debit = qs.filter(debit__isnull=False).aggregate(
            total=Sum('debit'))['total'] or Decimal('0')
        total_credit = qs.filter(credit__isnull=False).aggregate(
            total=Sum('credit'))['total'] or Decimal('0')

        # Current balance = most recent running_balance, or compute it
        latest = qs.exclude(running_balance__isnull=True).order_by('-date', '-created_at').first()
        current_balance = float(latest.running_balance) if latest else float(total_credit - total_debit)

        return Response({
            'total_debit': float(total_debit),
            'total_credit': float(total_credit),
            'current_balance': current_balance,
        })


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().filter(user=self.request.user)
        school_year = self.request.query_params.get('school_year')
        if school_year:
            qs = qs.filter(school_year=school_year)
        date_filter = self.request.query_params.get('date')
        if date_filter:
            qs = qs.filter(date=date_filter)
        month_filter = self.request.query_params.get('month')
        if month_filter:
            parts = month_filter.split('-')
            if len(parts) == 2:
                qs = qs.filter(date__year=parts[0], date__month=parts[1])
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=search) | Q(requested_by__icontains=search))
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='expense-summary')
    def expense_summary(self, request):
        qs = Expense.objects.filter(user=request.user)
        school_year = request.query_params.get('school_year')
        if school_year:
            qs = qs.filter(school_year=school_year)
        date_filter = request.query_params.get('date')
        if date_filter:
            qs = qs.filter(date=date_filter)
        month_filter = request.query_params.get('month')
        if month_filter:
            parts = month_filter.split('-')
            if len(parts) == 2:
                qs = qs.filter(date__year=parts[0], date__month=parts[1])

        total_expenses = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_canteen = qs.exclude(name__icontains='coconut').aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_coconut = qs.filter(name__icontains='coconut').aggregate(total=Sum('amount'))['total'] or Decimal('0')
        expense_count = qs.count()

        highest = qs.order_by('-amount').first()
        highest_amount = float(highest.amount) if highest else 0.0
        highest_name = highest.name if highest else ''

        latest = qs.order_by('-date').first()
        latest_date = str(latest.date) if latest else ''

        return Response({
            'total_expenses': float(total_expenses),
            'total_canteen': float(total_canteen),
            'total_coconut': float(total_coconut),
            'expense_count': expense_count,
            'highest_expense': highest_amount,
            'highest_expense_name': highest_name,
            'latest_expense_date': latest_date,
        })


# ---------------------------------------------------------------------------
# Revenue Recipients
# ---------------------------------------------------------------------------

class RevenueRecipientViewSet(viewsets.ModelViewSet):
    queryset = RevenueRecipient.objects.all()
    serializer_class = RevenueRecipientSerializer

    def get_permissions(self):
        # Allow unauthenticated (public/view-mode) users to read recipients
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        school_year = self.request.query_params.get('school_year')
        user_id = self.request.query_params.get('user_id')
        
        # Public view allows querying by user_id
        if user_id:
            qs = qs.filter(user_id=user_id)
        elif self.request.user and getattr(self.request.user, 'email', '') == 'amelitalayam@gmail.com':
            pass # Viewer sees all recipients (filtered by school year later)
        elif self.request.user and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        else:
            return qs.none()
            
        if school_year:
            qs = qs.filter(school_year=school_year)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['GET'])
@permission_classes([AllowAny])
def fix_db(request):
    from django.core.management.color import no_style
    from django.db import connection
    from .models import Transaction, Consignee, Expense, RevenueRecipient, Liquidation
    try:
        sequence_sql = connection.ops.sequence_reset_sql(no_style(), [Transaction, Consignee, Expense, RevenueRecipient, Liquidation])
        with connection.cursor() as cursor:
            for sql in sequence_sql:
                cursor.execute(sql)
        return Response({"status": "success", "message": "Database sequences reset successfully."})
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)

class LiquidationViewSet(viewsets.ModelViewSet):
    serializer_class = LiquidationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Liquidation.objects.filter(user=self.request.user)
        school_year = self.request.query_params.get('school_year')
        if school_year:
            qs = qs.filter(school_year=school_year)
        return qs

    def perform_create(self, serializer):
        from django.db import IntegrityError
        from rest_framework.exceptions import ValidationError
        try:
            serializer.save(user=self.request.user)
        except IntegrityError:
            raise ValidationError({"detail": "This month already exists for this school year."})
