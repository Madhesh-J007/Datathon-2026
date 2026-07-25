import httpx
import sys

BASE_URL = "https://ksp-backend-50044331349.development.catalystappsail.in"

def test_live_appsail():
    print("\n=======================================================")
    print("    LIVE CATALYST APPSAIL END-TO-END VERIFICATION       ")
    print("=======================================================\n")

    client = httpx.Client(timeout=30.0)

    # 1. Login
    login_res = client.post(
        f"{BASE_URL}/api/v1/auth/login",
        data={"username": "ksp_admin", "password": "change_me"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"[OK] Login Status: {login_res.status_code}")
    if login_res.status_code != 200:
        print(f"   Login Body: {login_res.text}")
        sys.exit(1)
    
    token = login_res.json()["access_token"]
    params = {"token": token}

    # 2. Dashboard
    dash_res = client.get(f"{BASE_URL}/api/v1/predictive/dashboard", params=params)
    print(f"[OK] Dashboard Status: {dash_res.status_code}")

    # 3. Cases
    cases_res = client.get(f"{BASE_URL}/api/v1/cases", params=params)
    print(f"[OK] Cases Status: {cases_res.status_code}")

    # 4. AI Hotspot
    hotspot_res = client.get(f"{BASE_URL}/api/v1/hotspot/predicted", params=params)
    print(f"[OK] AI Hotspot Status: {hotspot_res.status_code} ({hotspot_res.text[:120]})")

    # 5. Risk Prediction
    risk_res = client.get(f"{BASE_URL}/api/v1/intelligence/cases/1/predict", params=params)
    print(f"[OK] Risk Prediction Status: {risk_res.status_code} ({risk_res.text[:120]})")

    # 6. Similar Cases
    similar_res = client.get(f"{BASE_URL}/api/v1/intelligence/cases/1/similar", params=params)
    print(f"[OK] Similar Cases Status: {similar_res.status_code} ({similar_res.text[:120]})")

    # 7. Anomaly Detection
    anom_res = client.get(f"{BASE_URL}/api/v1/intelligence/anomalies", params=params)
    print(f"[OK] Anomaly Detection Status: {anom_res.status_code} ({anom_res.text[:120]})")

    # 8. Executive PDF Report Compile
    pdf_res = client.post(f"{BASE_URL}/api/v1/reports/compile", params=params, json={"case_input": 1})
    print(f"[OK] Executive PDF Status: {pdf_res.status_code} ({pdf_res.text[:120]})")

    # 9. CSV Export
    csv_res = client.get(f"{BASE_URL}/api/v1/reports/export/csv", params=params)
    print(f"[OK] CSV Export Status: {csv_res.status_code} ({len(csv_res.content)} bytes)")

    # 10. DOCX Export
    docx_res = client.get(f"{BASE_URL}/api/v1/reports/export/docx/1", params=params)
    print(f"[OK] DOCX Export Status: {docx_res.status_code} ({len(docx_res.content)} bytes)")

if __name__ == "__main__":
    test_live_appsail()
