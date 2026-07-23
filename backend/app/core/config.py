import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(APP_DIR)
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

class Settings(BaseSettings):
    # --- PostgreSQL ---
    POSTGRES_USER: str = "ksp_admin"
    POSTGRES_PASSWORD: str = "change_me"
    POSTGRES_DB: str = "ksp_crime_intel"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql://ksp_admin:change_me@postgres:5432/ksp_crime_intel"

    # --- Redis ---
    REDIS_URL: str = "redis://redis:6379/0"

    # --- JWT Auth ---
    JWT_SECRET_KEY: str = "change_me_to_a_long_random_string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_HOURS: int = 8

    # --- Backend settings ---
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173"

    # --- AI Engine ---
    AI_ENGINE_HOST: str = "0.0.0.0"
    AI_ENGINE_PORT: int = 8100
    AI_ENGINE_BASE_URL: str = "http://ai-engine:8100"

    # --- LLM settings ---
    LLM_PROVIDER: str = "anthropic"
    LLM_API_KEY: str = "change_me"
    LLM_MODEL: str = "claude-sonnet-4-6"
    
    # --- Embeddings ---
    # CaseEmbedding uses pgvector(768); LaBSE provides vectors of that size.
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/LaBSE"
    EMBEDDING_MODEL_VERSION: str = "phase4-labse-v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
