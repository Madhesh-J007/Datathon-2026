import logging
import sys
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from serving.router import router as ai_router
from config import settings

# Setup structured logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - [%(name)s] - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("ksp_ai_engine")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify configs, load sentence transformer, and warm up model checkpoints."""
    logger.info("Initializing KSP AI Engine Service...")
    start_time = time.time()

    # 1. Validate config parameters
    try:
        logger.info(f"Model Config - Name: {settings.EMBEDDING_MODEL_NAME}, Dimensions: {settings.EMBEDDING_DIMENSIONS}")
        logger.info(f"Data Config - Path: {settings.TRAINING_DATA_PATH}")
    except Exception as e:
        logger.critical(f"Configuration validation failed: {str(e)}")
        sys.exit(1)

    # 2. Train or load risk prediction model
    try:
        from models.risk_scoring.scorer import _model
        logger.info("Initializing risk engine model...")
        _ = _model()
        logger.info("Risk engine model successfully initialized.")
        app.state.risk_model_loaded = True
    except Exception as e:
        logger.error(f"Risk model initialization failure: {str(e)}")
        app.state.risk_model_loaded = False

    # 3. Pre-load heavy LaBSE sentence transformer asynchronously so startup completes immediately
    import asyncio
    async def _load_labse():
        try:
            from models.mo_similarity.embeddings import get_embedding_model
            logger.info("Pre-loading LaBSE sentence transformer in background...")
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, get_embedding_model)
            logger.info("LaBSE model successfully loaded in background.")
            app.state.models_loaded = True
            app.state.model_error = None
        except Exception as e:
            logger.error(f"Model loading diagnostic failure: {str(e)}")
            app.state.models_loaded = False
            app.state.model_error = str(e)

    asyncio.create_task(_load_labse())

    duration = time.time() - start_time
    logger.info(f"KSP AI Engine core startup completed in {duration:.2f}s.")
    yield


app = FastAPI(
    title="KSP AI Engine Service",
    description="Stateless inference service handling sentence embeddings and predictive hotspots.",
    version="1.0.1",
    lifespan=lifespan
)

app.include_router(ai_router)


@app.middleware("http")
async def exception_logging_middleware(request: Request, call_next):
    """Capture and log unhandled tracebacks from downstream model runs."""
    try:
        return await call_next(request)
    except Exception as exc:
        logger.error(f"Unhandled endpoint exception on {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal AI Engine Service Error"}
        )


@app.get("/health")
def health_check():
    """Verify current model state and configurations."""
    models_ok = getattr(app.state, "models_loaded", False)
    risk_ok = getattr(app.state, "risk_model_loaded", False)

    status_code = 200 if (models_ok and risk_ok) else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "online" if (models_ok and risk_ok) else "degraded",
            "service": "ai-engine",
            "diagnostics": {
                "labse_model_loaded": models_ok,
                "labse_error": getattr(app.state, "model_error", None),
                "risk_model_initialized": risk_ok,
                "config": {
                    "embedding_model": settings.EMBEDDING_MODEL_NAME,
                    "training_data_path": settings.TRAINING_DATA_PATH
                }
            }
        }
    )
