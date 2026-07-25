import os
import sys
import site
import glob
import logging
import importlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ksp_backend_init")

# Ensure the root of the backend package is on Python sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Add user site packages upfront
user_site = site.getusersitepackages()
if user_site and os.path.exists(user_site) and user_site not in sys.path:
    logger.info(f"Adding user site-packages: {user_site}")
    sys.path.insert(0, user_site)
    site.addsitedir(user_site)

# Automatically locate and add any other virtualenv site-packages to sys.path
possible_venv_paths = [
    os.path.join(backend_dir, ".venv"),
    os.path.join(backend_dir, "venv"),
    "/catalyst/.venv",
    "/catalyst/venv",
    "/catalyst/.local",
    "/app/.venv",
    "/app/venv",
    os.getenv("VIRTUAL_ENV", "")
]

for venv_path in possible_venv_paths:
    if venv_path and os.path.exists(venv_path):
        site_packages = glob.glob(os.path.join(venv_path, "lib", "python*", "site-packages"))
        for sp in site_packages:
            if sp not in sys.path:
                logger.info(f"Adding site-packages to sys.path: {sp}")
                sys.path.insert(0, sp)
                site.addsitedir(sp)

# Auto-install requirements if fastapi is missing in the container environment
try:
    import fastapi
except ImportError:
    import subprocess
    logger.info("FastAPI not found in active Python environment. Auto-installing requirements.txt...")
    req_file = os.path.join(backend_dir, "requirements.txt")
    if os.path.exists(req_file):
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "-r", req_file])
    
    # Reload user site-packages after installation
    user_site = site.getusersitepackages()
    if user_site and os.path.exists(user_site) and user_site not in sys.path:
        sys.path.insert(0, user_site)
        site.addsitedir(user_site)
    
    importlib.invalidate_caches()
    import fastapi

from app.main import app

if __name__ == "__main__":
    import uvicorn
    # Catalyst AppSail assigns port via X_ZOHO_CATALYST_LISTEN_PORT or PORT env vars
    port_str = os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT") or "8000"
    try:
        port = int(port_str)
    except ValueError:
        port = 8000

    logger.info(f"Starting KSP Backend FastAPI on host 0.0.0.0, port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
