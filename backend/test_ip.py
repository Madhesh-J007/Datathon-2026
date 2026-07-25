import psycopg2

regions = ["ap-south-1", "ap-southeast-1", "eu-central-1", "us-east-1", "us-west-1"]
project_ref = "vgflwpabareqxudaehbe"
password = "KSPdatabase2026"

print("--- TESTING SUPABASE POOLERS WITH PROJECT OPTIONS ---")
for r in regions:
    pooler_host = f"aws-0-{r}.pooler.supabase.com"
    # Connection string using options=project=project_ref
    url = f"postgresql://postgres:{password}@{pooler_host}:5432/postgres?options=project%3D{project_ref}&sslmode=require"
    masked = url.replace(password, "****")
    print(f"Testing region {r}: {masked}")
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        print(f"--> SUCCESS ON REGION {r}! CONNECTED TO SUPABASE POSTGRESQL!")
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print("    PostgreSQL Version:", cur.fetchone()[0])
            cur.execute("SELECT current_database();")
            print("    Database:", cur.fetchone()[0])
        conn.close()
        break
    except Exception as e:
        print(f"--> Failed on region {r}:", e)
