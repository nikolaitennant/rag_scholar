# Doppler Setup for RAG Scholar

## Quick Setup

1. **Install Doppler CLI:**
   ```bash
   # macOS
   brew install dopplerhq/cli/doppler

   # Linux
   curl -Ls https://cli.doppler.com/install.sh | sh
   ```

2. **Login & Setup:**
   ```bash
   doppler login
   doppler setup --project rag-scholar --config dev
   ```

3. **Add Secrets:**
   ```bash
   # Core secrets (no API keys - users provide those!)
   doppler secrets set ENVIRONMENT=development
   doppler secrets set DEBUG=true
   doppler secrets set GOOGLE_CLOUD_PROJECT=ragscholarai
   doppler secrets set JWT_SECRET_KEY=$(openssl rand -hex 32)
   ```

4. **Run with Doppler:**
   ```bash
   # Development
   doppler run -- docker-compose up

   # Production
   doppler run --config prod -- docker-compose -f docker-compose.prod.yml up
   ```

## Security Benefits

- ✅ Industry standard secret management
- ✅ Zero secrets in code/environment files
- ✅ Audit logging and access controls
- ✅ Automatic encryption and rotation
- ✅ Team collaboration with permissions

## Production Ready

Your setup uses the same security architecture as GitHub, Stripe, and Netflix.