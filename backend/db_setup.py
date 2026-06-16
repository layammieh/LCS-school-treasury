"""
Diagnostic + setup script: tests PostgreSQL connection and creates the school_treasurer database.
Run: python db_setup.py
"""
import sys

try:
    import psycopg2
except ImportError:
    print("psycopg2 not found. Install it: pip install psycopg2-binary")
    sys.exit(1)

# Common passwords to try
PASSWORDS = ['12345', 'postgres', '', 'admin', '1234', 'password']
HOSTS = ['localhost', '127.0.0.1']
PORT = 5432
USER = 'postgres'

def try_connect(host, password):
    try:
        conn = psycopg2.connect(
            host=host,
            port=PORT,
            user=USER,
            password=password,
            database='postgres',
            connect_timeout=3,
        )
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        return False

print("[*] Testing PostgreSQL connections...\n")

found_host = None
found_password = None

for host in HOSTS:
    for pwd in PASSWORDS:
        if try_connect(host, pwd):
            found_host = host
            found_password = pwd
            print(f"  [OK] Connected! host={host}, user={USER}, password='{pwd}'")
            break
    if found_host:
        break

if not found_host:
    print("  [FAIL] Could not connect with any password. Check PostgreSQL is running and credentials.")
    sys.exit(1)

print(f"\n[*] Using: host={found_host}, password='{found_password}'")

# Now create the database if it doesn't exist
conn = psycopg2.connect(
    host=found_host,
    port=PORT,
    user=USER,
    password=found_password,
    database='postgres',
)
conn.autocommit = True
cur = conn.cursor()

cur.execute("SELECT 1 FROM pg_database WHERE datname = 'school_treasurer'")
if cur.fetchone():
    print("\n  [OK] Database 'school_treasurer' already exists.")
else:
    cur.execute("CREATE DATABASE school_treasurer")
    print("\n  [OK] Created database 'school_treasurer'.")

cur.close()
conn.close()

# Write the discovered credentials to .env
env_content = f"""DB_NAME=school_treasurer
DB_USER={USER}
DB_PASSWORD={found_password}
DB_HOST={found_host}
DB_PORT={PORT}
"""
with open('.env', 'w') as f:
    f.write(env_content)

print(f"\n  [OK] Written credentials to .env")
print(f"\n[DONE] Setup complete! Now run: python manage.py migrate")
