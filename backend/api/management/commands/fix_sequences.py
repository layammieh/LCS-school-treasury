from django.core.management.base import BaseCommand
from django.core.management.color import no_style
from django.db import connection
from api.models import Transaction, Consignee, Expense, RevenueRecipient, Liquidation, CashOnBank

class Command(BaseCommand):
    help = 'Fixes database sequences'

    def handle(self, *args, **options):
        sequence_sql = connection.ops.sequence_reset_sql(no_style(), [Transaction, Consignee, Expense, RevenueRecipient, Liquidation, CashOnBank])
        with connection.cursor() as cursor:
            for sql in sequence_sql:
                cursor.execute(sql)
        self.stdout.write(self.style.SUCCESS('Successfully reset database sequences'))

