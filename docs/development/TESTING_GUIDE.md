# Testing RAG Scholar - Local Development

## 🧪 **Local Testing Strategy**

Let's test everything step-by-step to make sure it works perfectly before deploying to Google Cloud.

## 📋 **Pre-requisites**

1. **Python 3.10+** installed
2. **OpenAI API key** 
3. **Git** (for version control)

## 🚀 **Step 1: Local Setup**

### Install Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Run setup script
python setup.py
```

### Configure Environment
```bash
# Edit .env file (created by setup.py)
# Add your OpenAI API key:
OPENAI_API_KEY=your_key_here
```

## 🔧 **Step 2: Test Backend API Only**

### Start the FastAPI Backend
```bash
python -m rag_scholar.main
```

**Expected Output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Test API Health
```bash
# In another terminal
curl http://localhost:8000/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "domain": "general"
}
```

### View API Documentation
Open browser: http://localhost:8000/api/v1/docs

## 🎨 **Step 3: Test Streamlit UI**

### Start the Modern UI (keep API running)
```bash
# In another terminal (with API still running)
streamlit run src/rag_scholar/web/modern_app.py
```

**Expected Output:**
```
  You can now view your Streamlit app in your browser.
  Local URL: http://localhost:8501
```

### Test UI Features
1. **Open browser**: http://localhost:8501
2. **Check domain selector**: Should show 7 domains
3. **Upload a test document**: Try a small PDF or text file
4. **Ask a question**: Test basic chat functionality
5. **Try special commands**: 
   - `remember: Test fact`
   - `role: Friendly teacher`
   - `background: What is AI?`

## 🐳 **Step 4: Test Docker (Full Stack)**

### Stop Local Servers
```bash
# Stop both API and Streamlit (Ctrl+C in both terminals)
```

### Run with Docker Compose
```bash
docker-compose up --build
```

**Expected Output:**
```
✅ api_1  | INFO:     Uvicorn running on http://0.0.0.0:8000
✅ ui_1   | You can now view your Streamlit app in your browser.
✅ redis_1 | Ready to accept connections
```

### Test Full Stack
- **UI**: http://localhost:8501
- **API**: http://localhost:8000/api/v1/docs
- All features should work the same

## 🧪 **Step 5: Run Tests**

### Install Test Dependencies
```bash
pip install pytest pytest-cov pytest-asyncio
```

### Run Basic Tests
```bash
# Test imports work
python -c "from rag_scholar.config.settings import get_settings; print('✅ Settings import works')"

# Test API startup
python -c "from rag_scholar.main import create_app; print('✅ App creation works')"

# Test domain system
python -c "from rag_scholar.core.domains import DomainFactory, DomainType; print('✅ Domains work')"
```

## 🔍 **Troubleshooting Common Issues**

### Issue 1: ModuleNotFoundError
```bash
# Solution: Install in development mode
pip install -e .
```

### Issue 2: OpenAI API Error
```bash
# Check .env file has correct API key
cat .env | grep OPENAI_API_KEY
```

### Issue 3: Port Already in Use
```bash
# Kill existing processes
lsof -ti:8000 | xargs kill -9  # Kill API
lsof -ti:8501 | xargs kill -9  # Kill Streamlit
```

### Issue 4: Docker Issues
```bash
# Clean up Docker
docker-compose down
docker system prune -f
docker-compose up --build
```

## ✅ **Success Checklist**

- [ ] ✅ Backend API starts without errors
- [ ] ✅ API health endpoint responds
- [ ] ✅ Streamlit UI loads with beautiful interface
- [ ] ✅ Domain selector shows 7 options
- [ ] ✅ Document upload works
- [ ] ✅ Chat functionality works
- [ ] ✅ Special commands work (remember:, role:, background:)
- [ ] ✅ Docker compose runs full stack
- [ ] ✅ All imports work correctly

## 🚀 **Next Steps After Local Success**

Once everything works locally:

1. **Code Quality**: Run linting and type checking
2. **Git Commit**: Commit your working version
3. **Google Cloud**: Deploy to Cloud Run
4. **Monitoring**: Set up logs and metrics

## 📞 **Need Help?**

If you encounter issues:
1. Check the console logs for error messages
2. Verify your .env file has the correct API key
3. Make sure you're in the virtual environment
4. Try the troubleshooting steps above

Let's get this working locally first, then we'll deploy to Google Cloud! 🎉