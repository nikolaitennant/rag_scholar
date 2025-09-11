# Contributing to RAG Scholar

Thank you for your interest in contributing to RAG Scholar! This document provides guidelines and instructions for contributing.

## 🚀 **Quick Start for Contributors**

### 1. Fork and Clone
```bash
git clone https://github.com/yourusername/rag_scholar.git
cd rag_scholar
git checkout -b feature/your-feature-name
```

### 2. Development Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install with development dependencies
pip install -e ".[dev]"

# Install pre-commit hooks
pre-commit install
```

### 3. Run Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=rag_scholar

# Run specific test file
pytest tests/unit/test_settings.py -v
```

## 📋 **Development Workflow**

### Code Style
We use modern Python tooling for consistent code quality:

- **Black**: Code formatting
- **Ruff**: Fast linting and import sorting  
- **MyPy**: Type checking
- **Pre-commit**: Automated checks

```bash
# Format code
black src/ tests/

# Lint code
ruff check src/ tests/

# Type check
mypy src/

# Run all pre-commit checks
pre-commit run --all-files
```

### Commit Messages
Follow conventional commits format:
```
type(scope): description

feat(api): add new chat streaming endpoint
fix(ui): resolve domain switching bug
docs(readme): update installation instructions
test(unit): add domain factory tests
```

## 🏗️ **Project Structure**

```
rag_scholar/
├── src/rag_scholar/
│   ├── api/           # FastAPI routes
│   ├── core/          # Domain logic
│   ├── services/      # Business services
│   ├── config/        # Configuration
│   └── web/          # Streamlit UI
├── tests/
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   └── e2e/         # End-to-end tests
├── docs/             # Documentation
└── .github/          # CI/CD workflows
```

## 🧪 **Testing Guidelines**

### Test Categories
1. **Unit Tests**: Test individual functions/classes
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user workflows

### Writing Tests
```python
# Example unit test
def test_domain_factory():
    """Test domain factory creates correct instances."""
    domain = DomainFactory.create(DomainType.LAW)
    assert isinstance(domain, LawDomain)
    assert domain.domain_type == DomainType.LAW

# Example async test
async def test_chat_service(async_client, mock_openai):
    """Test chat service processes queries."""
    response = await async_client.post(
        "/api/v1/chat/query",
        json={"query": "Test question", "domain": "general"}
    )
    assert response.status_code == 200
```

### Test Coverage
- Aim for **80%+ coverage** on new code
- Critical paths should have **100% coverage**
- Include edge cases and error conditions

## 📝 **Documentation**

### Code Documentation
- Add docstrings to all public functions/classes
- Use Google-style docstrings
- Include type hints for all parameters

```python
def process_document(
    content: str,
    source: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> ProcessedDocument:
    """Process a document into chunks with metadata.
    
    Args:
        content: The document content to process
        source: The source filename or identifier
        metadata: Optional metadata dictionary
        
    Returns:
        ProcessedDocument with chunks and metadata
        
    Raises:
        ValueError: If content is empty or invalid
    """
```

### API Documentation
- FastAPI automatically generates OpenAPI docs
- Add detailed descriptions to endpoints
- Include examples for request/response bodies

## 🌟 **Feature Development**

### Adding New Domains
1. Create domain class in `src/rag_scholar/core/domains.py`
2. Add domain type to `DomainType` enum
3. Add domain configuration to `Settings.get_domain_config()`
4. Add tests for the new domain
5. Update documentation

### Adding New API Endpoints
1. Create route in appropriate `src/rag_scholar/api/routes/` file
2. Add Pydantic models for request/response
3. Add comprehensive tests
4. Update API documentation

### Adding New Services
1. Create service class in `src/rag_scholar/services/`
2. Add dependency injection in `dependencies.py`
3. Add unit and integration tests
4. Update service documentation

## 🐛 **Bug Reports**

When reporting bugs, include:
- Python version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant log output
- Minimal code example

## 💡 **Feature Requests**

For new features:
1. Check existing issues first
2. Describe the use case clearly
3. Explain why it's valuable
4. Consider implementation complexity
5. Be open to discussion and alternatives

## 🔒 **Security**

- Never commit API keys or secrets
- Use environment variables for sensitive config
- Report security issues privately
- Follow OWASP guidelines for web security

## 📄 **License**

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🆘 **Getting Help**

- Check existing issues and discussions
- Join our Discord community (link coming soon)
- Tag maintainers for urgent issues
- Be patient and respectful

## 🎉 **Recognition**

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special mentions for first-time contributors

---

**Happy contributing! 🚀**