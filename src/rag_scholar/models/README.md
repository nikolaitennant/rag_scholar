# Models Module

This directory contains Pydantic models for:

- **API Models**: Request/response schemas for FastAPI endpoints
- **Database Models**: SQLAlchemy models (when database layer is added)
- **Domain Models**: Core business logic data structures
- **Validation Models**: Input validation and serialization schemas

## Planned Structure

```
models/
├── api/           # API request/response models
├── database/      # Database models (SQLAlchemy)
├── domain/        # Core business models
└── validation/    # Input validation schemas
```

This structure supports future expansion while keeping the codebase organized.