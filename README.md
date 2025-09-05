# RAG Scholar

A professional research assistant powered by RAG (Retrieval-Augmented Generation) for academic research across multiple domains.

## Features

- **Multi-Domain Research**: Law, Science, Medicine, Business, Computer Science, Humanities
- **Smart Document Processing**: PDF, DOCX, TXT, MD, CSV support with advanced chunking
- **Hybrid Search**: Vector similarity + BM25 keyword search
- **Special Commands**: Remember facts, set personas, background knowledge mode
- **Production Ready**: FastAPI backend, Docker deployment, comprehensive testing

## Quick Start

### 1. Setup
```bash
git clone <repository-url>
cd rag_scholar
python setup.py
```

### 2. Configure
```bash
# Edit .env file
OPENAI_API_KEY=your_key_here
```

### 3. Run
```bash
docker-compose up
```

Access at: http://localhost:8501

## Documentation

- [User Guide](docs/user-guide/) - How to use RAG Scholar
- [API Reference](docs/api/) - Complete API documentation  
- [Development Guide](docs/development/) - Contributing and setup
- [Deployment Guide](docs/deployment/) - Production deployment

## Configuration

All settings are managed through the `.env` file:

```bash
# Core Settings
OPENAI_API_KEY=your_key_here
LLM_MODEL=gpt-4-turbo-preview
CHUNK_SIZE=1500
TEMPERATURE=0.0

# Ports
API_PORT=8000
UI_PORT=8501

# Features
USE_HYBRID_SEARCH=true
MAX_FILE_SIZE_MB=50
```

See `.env.example` for all available options.

## Architecture

```
src/rag_scholar/
├── api/        # FastAPI REST endpoints
├── core/       # Domain logic & document processing  
├── services/   # Business logic layer
├── config/     # Configuration management
└── web/        # Streamlit UI
```

## Development

```bash
# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/ && ruff check src/

# Type check
mypy src/
```

## License

MIT License

## Author

Nikolai Tennant