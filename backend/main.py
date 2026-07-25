import os
import sys

# Ensure the root of the backend package is on Python sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

if __name__ == "__main__":
    import uvicorn
    # Catalyst AppSail assigns port via X_ZOHO_CATALYST_LISTEN_PORT or PORT env vars
    port_str = os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT") or "8000"
    try:
        port = int(port_str)
    except ValueError:
        port = 8000

    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
