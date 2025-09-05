#!/usr/bin/env python3
"""Quick development test script."""

import os
import sys
import subprocess
from pathlib import Path

def run_backend():
    """Run just the backend for quick testing."""
    src_path = Path.cwd() / "src"
    os.environ["PYTHONPATH"] = str(src_path)
    
    print("🚀 Starting backend API...")
    print("📋 API docs will be at: http://localhost:8000/api/v1/docs")
    print("❤️ Health check at: http://localhost:8000/api/v1/health")
    print("\n🛑 Press Ctrl+C to stop\n")
    
    try:
        subprocess.run([sys.executable, "-m", "rag_scholar.main"])
    except KeyboardInterrupt:
        print("\n✅ Backend stopped")

def run_frontend():
    """Run just the frontend for quick testing."""
    src_path = Path.cwd() / "src"
    os.environ["PYTHONPATH"] = str(src_path)
    
    print("🎨 Starting frontend UI...")
    print("🌐 UI will be at: http://localhost:8501")
    print("📋 API expected at: http://localhost:8000/api/v1")
    print("\n🛑 Press Ctrl+C to stop\n")
    
    try:
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", 
            "src/rag_scholar/web/app.py", "--server.port", "8501"
        ])
    except KeyboardInterrupt:
        print("\n✅ Frontend stopped")

def test_imports():
    """Test that all imports work."""
    src_path = Path.cwd() / "src"
    sys.path.insert(0, str(src_path))
    
    tests = [
        ("Settings", "from rag_scholar.config.settings import get_settings; get_settings()"),
        ("Domains", "from rag_scholar.core.domains import DomainFactory, DomainType; DomainFactory.create(DomainType.LAW)"),
        ("FastAPI", "from rag_scholar.main import create_app; create_app()"),
        ("Services", "from rag_scholar.services.dependencies import get_chat_service"),
    ]
    
    print("🧪 Testing imports...")
    for name, test_code in tests:
        try:
            exec(test_code)
            print(f"  ✅ {name}")
        except Exception as e:
            print(f"  ❌ {name}: {e}")
    
    # Check API key
    if Path(".env").exists():
        with open(".env") as f:
            content = f.read()
            if "OPENAI_API_KEY=sk-" in content:
                print("  ✅ OpenAI API key configured")
            else:
                print("  ⚠️ OpenAI API key needs to be set in .env")
    else:
        print("  ⚠️ .env file not found")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("🚀 RAG Scholar Development Helper")
        print("\nUsage:")
        print("  python dev.py test     # Test imports and config")
        print("  python dev.py backend  # Run backend only")
        print("  python dev.py frontend # Run frontend only")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "test":
        test_imports()
    elif command == "backend":
        run_backend()
    elif command == "frontend":
        run_frontend()
    else:
        print(f"❌ Unknown command: {command}")