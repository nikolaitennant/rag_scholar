#!/bin/bash

# RAG Scholar Deployment Script
# Usage: ./deploy.sh [backend|frontend|both]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="tough-canto-471207-p6"
BACKEND_SERVICE="rag-scholar-backend"
REGION="europe-west2"
FRONTEND_DIR="frontend"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Function to deploy backend
deploy_backend() {
    echo -e "\n${GREEN}=== Deploying Backend ===${NC}\n"
    
    print_status "Building Docker image..."
    gcloud builds submit --tag gcr.io/${PROJECT_ID}/${BACKEND_SERVICE} --timeout=20m
    
    if [ $? -eq 0 ]; then
        print_status "Docker image built successfully!"
        
        print_status "Deploying to Cloud Run..."
        gcloud run deploy ${BACKEND_SERVICE} \
            --image gcr.io/${PROJECT_ID}/${BACKEND_SERVICE} \
            --platform managed \
            --region ${REGION} \
            --allow-unauthenticated \
            --set-env-vars OPENAI_API_KEY_SECRET=projects/${PROJECT_ID}/secrets/OPENAI_API_KEY/versions/latest \
            --memory 2Gi \
            --cpu 1 \
            --timeout 300
        
        if [ $? -eq 0 ]; then
            print_status "Backend deployed successfully!"
            echo -e "${GREEN}Backend URL:${NC} https://${BACKEND_SERVICE}-zhzzwmumka-nw.a.run.app"
        else
            print_error "Backend deployment failed!"
            exit 1
        fi
    else
        print_error "Docker build failed!"
        exit 1
    fi
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "\n${GREEN}=== Deploying Frontend ===${NC}\n"
    
    # Check if we're in the right directory
    if [ ! -d "${FRONTEND_DIR}" ]; then
        print_error "Frontend directory not found!"
        exit 1
    fi
    
    cd ${FRONTEND_DIR}
    
    # Check if .env has the production URL
    if grep -q "REACT_APP_API_URL=http://localhost" .env; then
        print_warning "Warning: .env is set to localhost. Updating to production..."
        cp .env .env.backup
        sed -i '' 's|http://localhost:8001|https://ragscholarai-zhzzwmumka-nw.a.run.app|g' .env
    fi
    
    print_status "Building React app..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_status "Build completed successfully!"
        
        print_status "Deploying to Firebase..."
        firebase deploy --only hosting
        
        if [ $? -eq 0 ]; then
            print_status "Frontend deployed successfully!"
            echo -e "${GREEN}Frontend URL:${NC} https://ragscholarai.web.app"
            
            # Restore .env if we modified it
            if [ -f .env.backup ]; then
                mv .env.backup .env
                print_status "Restored local .env file"
            fi
        else
            print_error "Firebase deployment failed!"
            # Restore .env if deployment failed
            if [ -f .env.backup ]; then
                mv .env.backup .env
            fi
            exit 1
        fi
    else
        print_error "Build failed!"
        exit 1
    fi
    
    cd ..
}

# Function to run pre-deployment checks
pre_deploy_checks() {
    echo -e "\n${GREEN}=== Running Pre-deployment Checks ===${NC}\n"
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes. Do you want to continue? (y/n)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled."
            exit 1
        fi
    else
        print_status "No uncommitted changes"
    fi
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed!"
        exit 1
    else
        print_status "gcloud CLI found"
    fi
    
    # Check if firebase is installed
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed!"
        exit 1
    else
        print_status "Firebase CLI found"
    fi
    
    # Check if logged in to gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_warning "Not logged in to gcloud. Logging in..."
        gcloud auth login
    else
        print_status "Authenticated with gcloud"
    fi
}

# Main script
echo -e "${GREEN}"
echo "╔══════════════════════════════════════╗"
echo "║     RAG Scholar Deployment Tool      ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
case "$1" in
    backend)
        pre_deploy_checks
        deploy_backend
        ;;
    frontend)
        pre_deploy_checks
        deploy_frontend
        ;;
    both|"")
        pre_deploy_checks
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo "Usage: $0 [backend|frontend|both]"
        echo ""
        echo "Options:"
        echo "  backend   - Deploy only the backend to Cloud Run"
        echo "  frontend  - Deploy only the frontend to Firebase"
        echo "  both      - Deploy both backend and frontend (default)"
        echo ""
        exit 1
        ;;
esac

echo -e "\n${GREEN}=== Deployment Complete! ===${NC}"
echo -e "Production URL: ${GREEN}https://ragscholarai.web.app${NC}"
echo -e "\n${YELLOW}Remember to test your changes in production!${NC}\n"