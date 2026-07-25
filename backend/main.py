import os
import sys
import site
import glob
import logging
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ksp_backend_init")

# Add /catalyst/.local/bin and ~/.local/bin to PATH
local_bin = "/catalyst/.local/bin"
user_bin = os.path.expanduser("~/.local/bin")
current_path = os.getenv("PATH", "")
if local_bin not in current_path:
    os.environ["PATH"] = f"{local_bin}:{user_bin}:{current_path}"

# Ensure the root of the backend package is on Python sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Add user site packages upfront
user_site = site.getusersitepackages()
if user_site and os.path.exists(user_site) and user_site not in sys.path:
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

# Safe application loader with diagnostic error fallback
app = None
startup_error = None

try:
    from app.main import app as main_app
    app = main_app
except Exception as err:
    startup_error = traceback.format_exc()
    logger.error(f"CRITICAL MODULE IMPORT ERROR:\n{startup_error}")
    
    from fastapi import FastAPI
    app = FastAPI(title="KSP Backend Diagnostic Fallback")
    
    @app.get("/")
    @app.get("/health")
    def health_diagnostic():
        return {
            "status": "degraded",
            "message": "KSP Backend loaded diagnostic fallback mode due to import error.",
            "error_traceback": startup_error
        }

if __name__ == "__main__":
    import uvicorn
    port_str = os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT") or "8000"
    try:
        port = int(port_str)
    except ValueError:
        port = 8000

    logger.info(f"Starting KSP Backend FastAPI on host 0.0.0.0, port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
