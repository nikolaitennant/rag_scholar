# API Documentation

## Overview

RAG Scholar provides a RESTful API built with FastAPI, offering programmatic access to all research capabilities.

## Interactive Documentation

When running the application, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc

## Authentication

Currently, the API uses OpenAI API keys for LLM access. Future versions will include:
- JWT token authentication
- API key management
- Rate limiting per user

## Core Endpoints

### Chat & Research
- `POST /api/v1/chat/query` - Process research queries
- `POST /api/v1/chat/stream` - Stream responses
- `WebSocket /api/v1/chat/ws/{session_id}` - Real-time chat

### Document Management
- `POST /api/v1/documents/upload` - Upload documents
- `GET /api/v1/documents/collections` - List collections
- `GET /api/v1/documents/collections/{collection}/documents` - List documents
- `DELETE /api/v1/documents/collections/{collection}/documents/{doc_id}` - Delete document

### Health & Monitoring
- `GET /api/v1/health` - Health check
- `GET /api/v1/health/ready` - Readiness probe

## Error Handling

The API returns standard HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limits

Default rate limits (configurable):
- 100 requests per minute per session
- 10 document uploads per hour
- WebSocket connections: 5 concurrent per IP

## Examples

See the [examples](examples/) directory for:
- Python client usage
- cURL examples  
- Integration patterns