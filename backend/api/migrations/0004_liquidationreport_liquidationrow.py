import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_alter_transaction_category'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LiquidationReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('school_year', models.CharField(default='2025-2026', max_length=50)),
                ('balance_forward', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('previous_bank_balance', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('otc', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('prepared_by', models.CharField(default='AMELITA C. LAYAM', max_length=200)),
                ('prepared_title', models.CharField(default='SC In-charge', max_length=200)),
                ('audited_by', models.CharField(default='LUCILDA GAPE', max_length=200)),
                ('audited_title', models.CharField(default='SC Auditor/ADAS', max_length=200)),
                ('approved_by', models.CharField(default='DANTE G. SISTO, P-', max_length=200)),
                ('approved_title', models.CharField(default='School Principal', max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='liquidation_reports', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='LiquidationRow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('month', models.CharField(max_length=20)),
                ('income', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('expenses', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('cash_deposit', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('cash_withdrawn', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('remarks', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rows', to='api.liquidationreport')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
