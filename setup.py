#!/usr/bin/env python3
"""Setup script for RAG Scholar."""

import subprocess
import sys
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
    
    # Install package in development mode
    print("📦 Installing dependencies...")
    if not run_command("pip install -e ."):
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
    
    print("\n🎉 Setup complete!")
    print("\nNext steps:")
    print("1. Edit .env and add your OPENAI_API_KEY")
    print("2. Run the application:")
    print("   docker-compose up  # Recommended (full stack)")
    print("   OR")  
    print("   python -m rag_scholar.main  # API backend")
    print("   streamlit run src/rag_scholar/web/app.py  # UI frontend")


if __name__ == "__main__":
    main()