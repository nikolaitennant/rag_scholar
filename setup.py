#!/usr/bin/env python3
"""Setup script for RAG Scholar."""

import subprocess
import sys
import os
from pathlib import Path


def run_command(command: str) -> bool:
    """Run a shell command and return success status."""
    try:
        subprocess.run(command, shell=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error: {e}")
        return False


def main():
    """Set up the RAG Scholar project."""
    print("🎓 Setting up RAG Scholar...")
    
    # Check if we're in a virtual environment
    if sys.prefix == sys.base_prefix:
        print("⚠️  Warning: You're not in a virtual environment.")
        print("It's recommended to create one first:")
        print("  python -m venv venv")
        print("  source venv/bin/activate  # On Windows: venv\\Scripts\\activate")
        response = input("Continue anyway? (y/N): ").lower()
        if response != 'y':
            return
    
    # Clean up any existing build artifacts first
    print("🧹 Cleaning up build artifacts...")
    run_command("rm -rf build/ dist/ *.egg-info/ src/*.egg-info/")
    run_command("find . -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true")
    
    # Upgrade pip first
    print("📦 Upgrading pip...")
    if not run_command("python -m pip install --upgrade pip"):
        print("⚠️ Pip upgrade failed, continuing...")
    
    # Install package in development mode
    print("📦 Installing dependencies...")
    if not run_command("pip install -e ."):
        print("❌ Editable install failed, trying direct dependency install...")
        # Fallback: install dependencies directly from pyproject.toml
        dependencies = [
            "fastapi>=0.110.0", "uvicorn[standard]>=0.27.0", 
            "langchain>=0.1.0", "langchain-openai>=0.0.5",
            "langchain-community>=0.0.10", "openai>=1.12.0",
            "pydantic>=2.5.0", "pydantic-settings>=2.1.0",
            "python-dotenv>=1.0.0", "streamlit>=1.31.0",
            "faiss-cpu>=1.7.4", "sentence-transformers>=2.3.0",
            "rank-bm25>=0.2.2", "unstructured[all-docs]>=0.12.0",
            "pdfplumber>=0.10.0", "PyMuPDF>=1.23.0",
            "docx2txt>=0.8", "pytesseract>=0.3.10",
            "Pillow>=10.2.0", "httpx>=0.26.0",
            "python-multipart>=0.0.6", "structlog>=24.1.0",
            "humanize>=4.9.0"
        ]
        dep_string = " ".join(dependencies)
        if not run_command(f"pip install {dep_string}"):
            print("❌ Failed to install dependencies")
            return
    
    # Create necessary directories
    print("📁 Creating directories...")
    directories = ["data", "indexes", "uploads", "logs"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"  ✓ {directory}/")
    
    # Check for .env file
    env_file = Path(".env")
    if not env_file.exists():
        print("⚙️  Creating .env file...")
        example_env = Path(".env.example")
        if example_env.exists():
            env_content = example_env.read_text()
            env_file.write_text(env_content)
            print("  ✓ Created .env from .env.example")
            print("  ⚠️  Please edit .env and add your OPENAI_API_KEY")
        else:
            print("  ❌ .env.example not found")
    else:
        print("  ✓ .env file already exists")
    
    # Set up Python path for development
    print("🔧 Setting up Python path...")
    current_dir = Path.cwd()
    src_path = current_dir / "src"
    
    # Test imports
    print("🧪 Testing imports...")
    sys.path.insert(0, str(src_path))
    
    try:
        from rag_scholar.config.settings import get_settings
        print("  ✓ Settings import works")
        
        from rag_scholar.core.domains import DomainFactory, DomainType
        # Test domain creation
        DomainFactory.create(DomainType.LAW)
        print("  ✓ Domain system works")
        
        settings = get_settings()
        if settings.openai_api_key and not settings.openai_api_key.startswith("your"):
            print("  ✓ OpenAI key configured")
        else:
            print("  ⚠️ OpenAI key needs to be set in .env")
            
    except Exception as e:
        print(f"  ❌ Import test failed: {e}")
        print("  You may need to set PYTHONPATH manually")
    
    print("\n🎉 Setup complete!")
    print("\nNext steps:")
    print("1. Edit .env and add your OPENAI_API_KEY (if not done already)")
    print("2. Run the application:")
    print("   docker-compose up  # Recommended (full stack)")
    print("   OR for development:")
    print(f"   export PYTHONPATH={src_path}")
    print("   python -m rag_scholar.main  # API backend")
    print("   streamlit run src/rag_scholar/web/app.py  # UI frontend")


if __name__ == "__main__":
    main()