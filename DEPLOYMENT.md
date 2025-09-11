# RAG Scholar - Google Cloud Run Deployment Guide

## Prerequisites

### 1. Google Cloud Setup
- Google Cloud project with billing enabled
- Required APIs enabled:
  - Cloud Run API
  - Cloud Build API
  - Artifact Registry API
  - Container Registry API

### 2. Environment Variables Required
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Will be set automatically by Cloud Run (defaults to 8000 in our config)

## Port Configuration

**IMPORTANT**: The application uses environment-aware port configuration:
- **settings.py**: `api_port = int(os.environ.get("PORT", 8000))`  
- **Dockerfile**: `EXPOSE 8080` (Cloud Run standard)
- **Cloud Run**: Automatically sets `PORT` environment variable (typically 8080)

Cloud Run will override the PORT environment variable, so the application dynamically binds to the assigned port while the Dockerfile exposes the standard Cloud Run port 8080.

## Deployment Methods

### Automated CI/CD (Recommended for Production)

This project has a Cloud Build trigger configured for automatic deployments:

- **Trigger Name**: `rmgpgab-ragscholarai-europe-west2-nikolaitennant-rag-scholaroqt`
- **Source Branch**: `refactor/modern-architecture` 
- **Deploy Target**: Cloud Run service `ragscholarai` in `europe-west2`
- **Build Time**: ~5-10 minutes (optimized with Docker layer caching)

**To deploy via CI/CD (Both Frontend & Backend):**
1. Make changes to frontend and/or backend code
2. Commit and push to the `refactor/modern-architecture` branch
3. Cloud Build automatically triggers and deploys BOTH:
   - Backend API to Cloud Run
   - Frontend to Firebase Hosting
4. Monitor progress in [Google Cloud Console > Cloud Build](https://console.cloud.google.com/cloud-build/builds)

**Build Optimizations Applied:**
- Docker layer caching enabled (removed `--no-cache`)
- Optimized Dockerfile with better layer separation
- `.dockerignore` file to reduce build context size
- Higher CPU build machine (E2_HIGHCPU_8) for faster builds
- `cloudbuild.yaml` configuration for consistent builds

**Current Production URLs:**
- **API Backend:** https://ragscholarai-zhzzwmumka-nw.a.run.app
- **Frontend (Firebase):** https://ragscholarai.web.app

### Manual Deployment Steps

For manual deployments or initial setup:

### 1. Install Google Cloud CLI (if not already installed)

```bash
# Install Google Cloud CLI
curl -sSL https://sdk.cloud.google.com | bash

# Add to PATH (add to ~/.bashrc for persistence)
export PATH=$HOME/google-cloud-sdk/bin:$PATH

# Verify installation
gcloud --version
```

### 2. Authenticate with Google Cloud

```bash
# Authenticate (will open browser)
gcloud auth login

# For WSL/headless systems, use:
gcloud auth login --no-launch-browser
# Then visit the provided URL and complete authentication
```

### 3. Set Project and Region

```bash
# List available projects
gcloud projects list

# Set active project (replace with your project ID)
gcloud config set project YOUR-PROJECT-ID

# Verify current configuration
gcloud config list
```

### 4. Deploy Backend API

```bash
# From project root directory - Using Secret Manager (RECOMMENDED)
gcloud run deploy ragscholarai \
  --source . \
  --region europe-west2 \
  --allow-unauthenticated \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest

# Alternative: Using environment variables (less secure)
gcloud run deploy ragscholarai \
  --source . \
  --region europe-west2 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY="your-openai-api-key-here"
```

**Note**: Port is automatically detected from Dockerfile EXPOSE directive, no need to specify --port.

### 5. Deploy Frontend

**Current Setup: Firebase Hosting**
The frontend is deployed to Firebase Hosting at: https://ragscholarai.web.app

```bash
# Deploy to Firebase (if firebase CLI is set up)
cd frontend
firebase deploy --only hosting
```

**Alternative: Cloud Run Frontend**
```bash
# From frontend directory (if needed for development)
cd frontend

gcloud run deploy rag-scholar-frontend \
  --source . \
  --port 8080 \
  --region europe-west2 \
  --allow-unauthenticated
```

## Configuration Files

### Backend Dockerfile
- Uses multi-stage build for optimization
- Sets `ENV PORT=8000` for consistency with settings.py
- Exposes port 8000
- Health check uses PORT environment variable

### Frontend Dockerfile  
- Uses nginx with dynamic port configuration
- nginx.conf template uses `${PORT}` variable
- Cloud Run sets PORT=8080 by default for frontend

### Settings Configuration
Located in `src/rag_scholar/config/settings.py`:
- Port: `int(os.environ.get("PORT", 8000))`
- All other settings configurable via environment variables
- Domain-specific configurations included

## Secret Manager Configuration (Recommended)

### Create Secret (if not already done)
```bash
# Create the secret in Secret Manager
echo "your-openai-api-key-here" | gcloud secrets create OPENAI_API_KEY --data-file=-

# Update existing secret
echo "your-new-openai-api-key-here" | gcloud secrets versions add OPENAI_API_KEY --data-file=-

# Verify secret exists
gcloud secrets list
```

### Grant Cloud Run Access to Secret
```bash
# Get the Cloud Run service account
gcloud run services describe ragscholarai --region europe-west2 --format="value(spec.template.spec.serviceAccountName)"

# Grant access (replace with actual service account)
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
    --member="serviceAccount:YOUR-PROJECT-NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Environment Variables for Production

### Required (when using Secret Manager)
```bash
# No environment variables needed - secrets are mounted automatically
```

### Required (when using environment variables - less secure)
```bash
OPENAI_API_KEY=sk-...
```

### Optional (with defaults)
```bash
PORT=8000                    # Set automatically by Cloud Run
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=["*"]
CHUNK_SIZE=1500
RETRIEVAL_K=5
TEMPERATURE=0.0
```

## Troubleshooting

### Common Issues

1. **"Port not correct" error**
   - Ensure Dockerfile `EXPOSE` matches settings.py default port
   - Verify Cloud Run service is configured with correct port
   - Check that application binds to `0.0.0.0` not `localhost`

2. **Billing not enabled**
   ```
   ERROR: Billing account for project not found
   ```
   - Go to Google Cloud Console → Billing
   - Link a billing account to your project

3. **APIs not enabled**
   ```
   The following APIs are not enabled
   ```
   - The deployment will prompt to enable required APIs
   - Respond 'Y' to enable automatically

4. **Authentication issues**
   - Run `gcloud auth list` to check credentials
   - Re-authenticate with `gcloud auth login`
   - Ensure you have necessary permissions on the project

5. **Build failures**
   - Check Dockerfile syntax
   - Verify all dependencies are in requirements files
   - Ensure build context doesn't include large unnecessary files

### Deployment Verification

```bash
# Get service URL
gcloud run services describe rag-scholar-api --region us-central1 --format 'value(status.url)'

# Test health endpoint
curl https://YOUR-SERVICE-URL/api/v1/health

# Check logs
gcloud run services logs tail rag-scholar-api --region us-central1
```

## Production Recommendations

### Security
- Use Google Secret Manager for sensitive environment variables
- Enable VPC Connector for database access
- Configure custom domains with SSL certificates
- Set up proper IAM roles and permissions

### Monitoring
- Enable Cloud Monitoring and Logging
- Set up alerting policies for errors and performance
- Use Cloud Trace for request tracing

### Scaling
```bash
# Configure concurrency and scaling
gcloud run services update rag-scholar-api \
  --region us-central1 \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 100 \
  --cpu 2 \
  --memory 4Gi
```

## Regional Deployment

For London-based deployment:
```bash
# Use europe-west2 (London) region
gcloud run deploy rag-scholar-api \
  --source . \
  --port 8000 \
  --region europe-west2 \
  --allow-unauthenticated
```

## Cost Optimization

- Use minimum instances = 0 for development
- Set appropriate CPU and memory limits
- Consider using Cloud Build triggers for CI/CD instead of local builds
- Use multi-regional deployment for production traffic

## Support

For issues with this deployment:
1. Check the troubleshooting section above
2. Review Cloud Run logs: `gcloud run services logs tail SERVICE-NAME --region REGION`
3. Verify all environment variables are set correctly
4. Ensure billing is enabled and APIs are activated