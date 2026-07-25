import os
import sys
import site
import glob
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ksp_backend_init")

# Ensure the root directory of the backend is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def add_catalyst_paths():
    """Dynamically discover and register all site-packages and bin paths on Catalyst AppSail."""
    search_patterns = [
        "/catalyst/**/site-packages",
        "/catalyst/.local/lib/python*/site-packages",
        "/catalyst/venv/lib/python*/site-packages",
        "/catalyst/.venv/lib/python*/site-packages",
        os.path.expanduser("~/.local/lib/python*/site-packages"),
        os.path.expanduser("~/.local/site-packages")
    ]
    for pattern in search_patterns:
        for site_dir in glob.glob(pattern, recursive=True):
            if os.path.isdir(site_dir) and site_dir not in sys.path:
                logger.info(f"Registering Catalyst site-packages: {site_dir}")
                sys.path.insert(0, site_dir)
                site.addsitedir(site_dir)

# Register all existing site-packages
add_catalyst_paths()

# Ensure dependencies are available before importing app.main
try:
    import fastapi
    import uvicorn
    import sqlalchemy
    import passlib
    import bcrypt
except ImportError as missing_err:
    logger.warning(f"Dependency missing on sys.path ({missing_err}). Installing requirements.txt...")
    req_path = os.path.join(backend_dir, "requirements.txt")
    if os.path.exists(req_path):
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", req_path, "--no-warn-script-location"], check=False)
        add_catalyst_paths()
        logger.info("Re-executing Python process with freshly installed packages...")
        os.execv(sys.executable, [sys.executable] + sys.argv)
    else:
        logger.error(f"requirements.txt not found at {req_path}")

from app.main import app
import uvicorn

if __name__ == "__main__":
    port_str = os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT") or "8000"
    try:
        port = int(port_str)
    except ValueError:
        port = 8000

    logger.info(f"Starting KSP Backend FastAPI on host 0.0.0.0, port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
