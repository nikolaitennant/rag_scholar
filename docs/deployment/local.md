# Local Development Setup

## Quick Start

### Prerequisites
- Python 3.10+
- OpenAI API key

### Installation

1. **Clone and setup**
```bash
git clone <repository-url>
cd rag_scholar
python setup.py
```

2. **Configure environment**
```bash
# Edit .env file and add your API key
OPENAI_API_KEY=your_key_here
```

3. **Run the application**
```bash
# Option 1: Full stack with Docker
docker-compose up

# Option 2: Development mode
python -m rag_scholar.main  # Backend
streamlit run src/rag_scholar/web/app.py  # Frontend
```

### Access Points
- UI: http://localhost:8501
- API: http://localhost:8000/api/v1/docs

## Configuration

All settings are managed through the `.env` file. Key settings:

```bash
# Model Configuration
LLM_MODEL=gpt-4-turbo-preview
TEMPERATURE=0.0
CHUNK_SIZE=1500

# API Settings  
API_PORT=8000
UI_PORT=8501

# Features
USE_HYBRID_SEARCH=true
MAX_FILE_SIZE_MB=50
```

## Development Workflow

1. **Make changes** to code
2. **Test locally** with docker-compose
3. **Run tests** with pytest
4. **Commit changes** (pre-commit hooks run automatically)