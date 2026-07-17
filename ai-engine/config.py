from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the stateless AI inference service."""

    EMBEDDING_MODEL_NAME: str = "sentence-transformers/LaBSE"
    EMBEDDING_MODEL_VERSION: str = "phase4-labse-v1"
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_BATCH_SIZE: int = 32
    TRAINING_DATA_PATH: str = "/database/seeds/data/CrimeCases_AI.csv"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
