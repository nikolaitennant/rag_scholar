# Multi-stage Dockerfile for RAG Scholar

# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files and source (needed for build)
COPY pyproject.toml ./
COPY src/ ./src/

# Install Python dependencies (can cache if pyproject.toml unchanged)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY src/ ./src/
COPY pyproject.toml ./

# Create necessary directories
RUN mkdir -p data/uploads data/indexes data/sessions

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Default command (can be overridden)
CMD sh -c "python -m uvicorn rag_scholar.main:app --host 0.0.0.0 --port ${PORT:-8080}"