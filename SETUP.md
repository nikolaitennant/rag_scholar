# RAG Scholar AI - Setup & Deployment Guide

## 🚀 Quick Start

### Production URL
🌐 **Live App**: https://ragscholarai.web.app

### Local Development
💻 **Local URL**: http://localhost:3000

---

## 📋 Prerequisites

- Node.js (v18+)
- Python (3.11+)
- Google Cloud CLI (`gcloud`)
- Firebase CLI (`firebase`)
- Git

---

## 🏃‍♂️ Local Development Setup

### First Time Setup

1. **Clone the repository**
```bash
git clone [your-repo-url]
cd rag_scholar
```

2. **Set up Python virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install core dependencies
pip install fastapi uvicorn python-dotenv pydantic-settings
pip install langchain langchain-openai langchain-community openai
pip install numpy pandas scikit-learn sentence-transformers faiss-cpu
pip install structlog humanize python-multipart rank-bm25
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

4. **Set up environment variables**
```bash
# Create .env file in root directory
echo "OPENAI_API_KEY=your-api-key-here" > .env

# Create required data directory structure
mkdir -p data/uploads data/indexes data/sessions
```

### Running Locally

Open two terminal windows:

#### Terminal 1 - Backend (Port 8001)
```bash
cd /Users/nikolaitennant/Documents/GitHub/rag_scholar
source venv/bin/activate
export OPENAI_API_KEY="your-openai-api-key"
PYTHONPATH=/Users/nikolaitennant/Documents/GitHub/rag_scholar/src python -m uvicorn src.rag_scholar.main:app --reload --host 0.0.0.0 --port 8001
```

#### Terminal 2 - Frontend (Port 3000)
```bash
cd /Users/nikolaitennant/Documents/GitHub/rag_scholar/frontend
npm start
```

✅ **App will open automatically at** http://localhost:3000

### Development Features
- 🔄 **Hot Reload**: Both frontend and backend auto-reload on file changes
- 🎯 **Frontend Changes**: Edit files in `frontend/src/`
- 🐍 **Backend Changes**: Edit files in `src/rag_scholar/`
- 📝 **No Docker Required**: Direct Python/Node.js execution for faster development

---

## 🚢 Production Deployment

### Easy Deployment (Using Script)

We've created a deployment script to simplify the process:

```bash
# Deploy both frontend and backend
./deploy.sh

# Deploy only backend
./deploy.sh backend

# Deploy only frontend
./deploy.sh frontend
```

### Manual Deployment

#### Deploy Backend to Google Cloud Run
```bash
# Build and push Docker image
gcloud builds submit --tag gcr.io/tough-canto-471207-p6/rag-scholar-backend

# Deploy to Cloud Run
gcloud run deploy rag-scholar-backend \
  --image gcr.io/tough-canto-471207-p6/rag-scholar-backend \
  --platform managed \
  --region europe-west2 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1
```

#### Deploy Frontend to Firebase
```bash
cd frontend

# Ensure .env points to production backend
# Edit .env to use: REACT_APP_API_URL=https://ragscholarai-zhzzwmumka-nw.a.run.app/api/v1

# Build production bundle
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Restore local .env for development
# Edit .env back to: REACT_APP_API_URL=http://localhost:8001/api/v1
```

---

## 📁 Project Structure

```
rag_scholar/
├── src/                    # Backend Python code
│   └── rag_scholar/       # Main application package
├── frontend/              # React frontend
│   ├── src/              # React source code
│   ├── public/           # Static assets
│   └── .env              # Frontend environment variables
├── data/                 # All data storage
│   ├── uploads/          # User uploaded documents
│   ├── indexes/          # Vector database indexes
│   └── sessions/         # User session data
├── venv/                 # Python virtual environment
├── Dockerfile            # Backend container configuration
├── pyproject.toml        # Python package configuration
├── deploy.sh            # Deployment automation script
├── SETUP.md             # This documentation
└── .env                 # Backend environment variables
```

---

## 🔧 Configuration Files

### Frontend Environment (.env in frontend/)
```bash
# Development
REACT_APP_API_URL=http://localhost:8001/api/v1

# Production
REACT_APP_API_URL=https://ragscholarai-zhzzwmumka-nw.a.run.app/api/v1
```

### Backend Environment (.env in root)
```bash
OPENAI_API_KEY=your-openai-api-key
```

---

## 🛠 Common Commands

### Development
```bash
# Start backend
source venv/bin/activate
python -m uvicorn src.rag_scholar.main:app --reload --port 8001

# Start frontend
cd frontend && npm start

# Install new Python package
pip install package-name

# Install new npm package
cd frontend && npm install package-name
```

### Git Workflow
```bash
# Save changes
git add .
git commit -m "Description of changes"
git push origin refactor/modern-architecture

# Deploy to production
./deploy.sh
```

---

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Find process using port 8001
lsof -i :8001
# Kill the process
kill -9 <PID>
```

### Python Import Errors
```bash
# Ensure virtual environment is activated
source venv/bin/activate
# Install missing packages
pip install -r requirements.txt
```

### Frontend Won't Start
```bash
cd frontend
rm -rf node_modules
npm install
npm start
```

### Backend Module Not Found
```bash
# Set PYTHONPATH when running
PYTHONPATH=/path/to/rag_scholar/src python -m uvicorn src.rag_scholar.main:app
```

---

## 📊 Architecture Overview

### Frontend (React)
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Firebase Hosting
- **URL**: https://ragscholarai.web.app

### Backend (Python)
- **Framework**: FastAPI
- **AI/ML**: LangChain, OpenAI
- **Hosting**: Google Cloud Run
- **Container**: Docker
- **URL**: https://ragscholarai-zhzzwmumka-nw.a.run.app

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Frontend URL | http://localhost:3000 | https://ragscholarai.web.app |
| Backend URL | http://localhost:8001 | https://ragscholarai-zhzzwmumka-nw.a.run.app |
| Hot Reload | ✅ Enabled | ❌ Disabled |
| Debug Mode | ✅ On | ❌ Off |
| Environment | Local Python/Node | Docker/Cloud Run |

---

## 🤝 Workflow Summary

1. **Develop Locally**: Make changes, test at localhost:3000
2. **Commit Changes**: `git add . && git commit -m "message"`
3. **Push to GitHub**: `git push`
4. **Deploy to Production**: `./deploy.sh`
5. **Verify Production**: Check https://ragscholarai.web.app

---

## 📝 Notes

- **API Keys**: Never commit API keys to Git. Use environment variables.
- **Testing**: Always test locally before deploying to production.
- **Branches**: Currently using `refactor/modern-architecture` branch.
- **Region**: Services deployed to `europe-west2` (London) for optimal performance.

---

## 🆘 Need Help?

- Check the logs: `gcloud run logs read --service rag-scholar-backend`
- Firebase issues: `firebase deploy --debug`
- Local issues: Check terminal output for error messages

---

*Last updated: September 2025*