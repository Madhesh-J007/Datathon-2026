import psycopg2

urls = [
    "postgresql://postgres.vgflwpabareqxudaehbe:KSPdatabase2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    "postgresql://postgres.vgflwpabareqxudaehbe:KSPdatabase2026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require",
    "postgresql://postgres:KSPdatabase2026@db.vgflwpabareqxudaehbe.supabase.co:5432/postgres?sslmode=require"
]

for url in urls:
    print(f"Testing {url}...")
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        print(f"SUCCESS: {url}")
        conn.close()
        break
    except Exception as e:
        print(f"FAILED: {e}")
