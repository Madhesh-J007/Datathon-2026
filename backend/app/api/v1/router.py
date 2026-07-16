from fastapi import APIRouter
from app.api.v1.endpoints import cases

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
