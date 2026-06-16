"""
Database seeder for School Treasurer app.
Run from the backend directory: python seed.py
Populates the database with mock data matching the frontend's hardcoded data,
and creates a default admin user (admin / password123).
"""
import os
import sys
import django
from datetime import date, time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from api.models import Consignee, Transaction


def run():
    print("[*] Starting database seed...")

    # Create admin user
    if not User.objects.filter(username='admin').exists():
        user = User.objects.create_superuser(
            username='admin',
            email='admin@lcs-edu.gov',
            password='password123',
            first_name='Marcus',
            last_name='Thorne',
        )
        Token.objects.get_or_create(user=user)
        print("  [OK] Created admin user (username: admin, password: password123)")
    else:
        print("  [SKIP] Admin user already exists.")

    admin_user = User.objects.get(username='admin')

    # Consignees (Canteen Vendors)
    if Consignee.objects.exists():
        print("  [SKIP] Consignees already seeded. Setting user to admin for unassigned ones.")
        Consignee.objects.filter(user__isnull=True).update(user=admin_user)
    else:
        consignees_data = [
            {
                'vendor_name': 'Green Harvest Salads',
                'stall_no': 'B-04',
                'contact_person': 'Elena Rodriguez',
                'phone': '+1 (555) 012-3456',
                'status': 'active',
                'date_registered': date(2023, 9, 12),
            },
            {
                'vendor_name': 'Artisan Bakery & Co.',
                'stall_no': 'A-12',
                'contact_person': 'David Chen',
                'phone': '+1 (555) 098-7654',
                'status': 'active',
                'date_registered': date(2023, 10, 5),
            },
            {
                'vendor_name': 'Sushi Roll Station',
                'stall_no': 'C-02',
                'contact_person': 'Yuki Tanaka',
                'phone': '+1 (555) 224-5678',
                'status': 'inactive',
                'date_registered': date(2023, 11, 20),
            },
            {
                'vendor_name': 'Wok & Bowl Express',
                'stall_no': 'B-07',
                'contact_person': 'Marcus Weber',
                'phone': '+1 (555) 456-7890',
                'status': 'active',
                'date_registered': date(2023, 12, 1),
            },
            {
                'vendor_name': 'Pasta Fresh House',
                'stall_no': 'A-05',
                'contact_person': 'Lucia Ferrari',
                'phone': '+1 (555) 321-6543',
                'status': 'active',
                'date_registered': date(2024, 1, 15),
            },
            {
                'vendor_name': 'Burger Haven',
                'stall_no': 'D-03',
                'contact_person': 'James Park',
                'phone': '+1 (555) 789-0123',
                'status': 'active',
                'date_registered': date(2024, 2, 8),
            },
            {
                'vendor_name': 'Spices of India',
                'stall_no': 'C-08',
                'contact_person': 'Priya Sharma',
                'phone': '+1 (555) 654-3210',
                'status': 'active',
                'date_registered': date(2024, 3, 22),
            },
        ]
        Consignee.objects.bulk_create([Consignee(user=admin_user, **c) for c in consignees_data])
        print(f"  [OK] Created {len(consignees_data)} consignees.")

    # Collection Transactions
    if Transaction.objects.filter(transaction_type='collection').exists():
        print("  [SKIP] Collection transactions already seeded. Setting user to admin for unassigned ones.")
        Transaction.objects.filter(transaction_type='collection', user__isnull=True).update(user=admin_user)
    else:
        collections_data = [
            {
                'transaction_type': 'collection',
                'student_name': 'Julianne Dorsey',
                'student_initials': 'JD',
                'grade_section': 'Grade 10 - Section A',
                'id_number': '#LCS 2023-049',
                'amount': 1250.00,
                'category': 'Tuition',
                'status': 'paid',
                'date': date(2023, 10, 24),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Marcus Knight',
                'student_initials': 'MK',
                'grade_section': 'Grade 12 - Section C',
                'id_number': '#LCS 2023-112',
                'amount': 800.00,
                'category': 'Tuition',
                'status': 'partial',
                'date': date(2023, 10, 24),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Alisa Richardson',
                'student_initials': 'AR',
                'grade_section': 'Grade 9 - Section B',
                'id_number': '#LCS 2023-238',
                'amount': 1400.00,
                'category': 'Tuition',
                'status': 'unpaid',
                'date': date(2023, 10, 23),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Thomas Weaver',
                'student_initials': 'TW',
                'grade_section': 'Grade 11 - Section A',
                'id_number': '#LCS 2023-014',
                'amount': 2100.00,
                'category': 'Tuition',
                'status': 'paid',
                'date': date(2023, 10, 24),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Emily Sinclair',
                'student_initials': 'ES',
                'grade_section': 'Grade 10 - Section D',
                'id_number': '#LCS 2023-382',
                'amount': 450.00,
                'category': 'Tuition',
                'status': 'paid',
                'date': date(2023, 10, 23),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Jameson Academy Books',
                'student_initials': 'JA',
                'grade_section': '',
                'id_number': '#INV-001',
                'amount': 12450.00,
                'category': 'Supplies',
                'status': 'paid',
                'date': date(2024, 9, 24),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Sophia Martinez',
                'student_initials': 'SM',
                'grade_section': 'Grade 10',
                'id_number': '#INV-002',
                'amount': 4200.00,
                'category': 'Tuition',
                'status': 'pending',
                'date': date(2024, 9, 22),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Elite Facility Services',
                'student_initials': 'EF',
                'grade_section': '',
                'id_number': '#INV-003',
                'amount': 1850.00,
                'category': 'Maintenance',
                'status': 'overdue',
                'date': date(2024, 9, 20),
            },
            {
                'transaction_type': 'collection',
                'student_name': 'Global Stationery Ltd',
                'student_initials': 'GS',
                'grade_section': '',
                'id_number': '#INV-004',
                'amount': 620.45,
                'category': 'Supplies',
                'status': 'paid',
                'date': date(2024, 9, 18),
            },
        ]
        Transaction.objects.bulk_create([Transaction(user=admin_user, **t) for t in collections_data])
        print(f"  [OK] Created {len(collections_data)} collection transactions.")

    # Ledger Transactions
    if Transaction.objects.filter(transaction_type='ledger').exists():
        print("  [SKIP] Ledger transactions already seeded. Setting user to admin for unassigned ones.")
        Transaction.objects.filter(transaction_type='ledger', user__isnull=True).update(user=admin_user)
    else:
        ledger_data = [
            {
                'transaction_type': 'ledger',
                'description': 'Q4 Semester Payment - Grade 10',
                'category': 'Tuition',
                'status': 'paid',
                'date': date(2023, 10, 24),
                'time': time(10, 45),
                'debit': None,
                'credit': 1250.00,
                'running_balance': 142850.00,
                'amount': 1250.00,
            },
            {
                'transaction_type': 'ledger',
                'description': 'HVAC System Repair - Block C',
                'category': 'Maintenance',
                'status': 'paid',
                'date': date(2023, 10, 23),
                'time': time(14, 15),
                'debit': 450.00,
                'credit': None,
                'running_balance': 141600.00,
                'amount': 450.00,
            },
            {
                'transaction_type': 'ledger',
                'description': 'Monthly Water Supply Bill',
                'category': 'Utilities',
                'status': 'paid',
                'date': date(2023, 10, 23),
                'time': time(11, 0),
                'debit': 800.00,
                'credit': None,
                'running_balance': 142050.00,
                'amount': 800.00,
            },
            {
                'transaction_type': 'ledger',
                'description': 'Annual Sports Day Sponsorship',
                'category': 'Events',
                'status': 'paid',
                'date': date(2023, 10, 22),
                'time': time(9, 30),
                'debit': None,
                'credit': 2500.00,
                'running_balance': 142940.00,
                'amount': 2500.00,
            },
            {
                'transaction_type': 'ledger',
                'description': 'Contractor Payment - Security Services',
                'category': 'Payroll',
                'status': 'paid',
                'date': date(2023, 10, 21),
                'time': time(16, 45),
                'debit': 1100.00,
                'credit': None,
                'running_balance': 140440.00,
                'amount': 1100.00,
            },
        ]
        Transaction.objects.bulk_create([Transaction(user=admin_user, **t) for t in ledger_data])
        print(f"  [OK] Created {len(ledger_data)} ledger transactions.")

    print("\n[DONE] Seeding complete!")
    print("       Login: username=admin  password=password123")


if __name__ == '__main__':
    run()
