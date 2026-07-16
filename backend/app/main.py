"""
FastAPI application entrypoint.

Purpose: Creates the app instance, registers the v1 API router, CORS,
and startup/shutdown events.
Used by: uvicorn/gunicorn to launch the Core Backend service (SAD Section 3.2).

NOTE: Scaffold placeholder only. Middleware registration (auth, jurisdiction
scope, audit hook) and router inclusion to be wired in Milestone 0/2.
"""

# from fastapi import FastAPI
# from app.api.v1.router import api_router
# from app.core.config import settings
#
# app = FastAPI(title="KSP Crime Intelligence Platform - Core Backend", version="0.1.0")
# app.include_router(api_router, prefix="/api/v1")
