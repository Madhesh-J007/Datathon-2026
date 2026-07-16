from fastapi import FastAPI

# Minimal FastAPI instance to stand up the AI Engine microservice.
# Model inference/embeddings logic will be integrated during Milestone 4/5.
app = FastAPI(
    title="KSP AI Engine Service",
    description="Stateless inference service handling sentence embeddings and predictive hotspots.",
    version="1.0.0"
)

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "ai-engine"
    }
