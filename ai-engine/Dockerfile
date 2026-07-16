# AI Engine (FastAPI inference microservice) production image.
# Purpose: containerizes the ai-engine/ service, kept separate from the
# Core Backend per SAD Section 2.1 (independently scalable AI/ML layer).
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8100
CMD ["uvicorn", "serving.main:app", "--host", "0.0.0.0", "--port", "8100"]
