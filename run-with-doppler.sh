#!/bin/bash

# Most secure way to run with Doppler
# This uses doppler run to inject secrets into the Docker Compose environment

echo "🔐 Starting RAG Scholar with Doppler secrets..."
doppler run --mount-template='docker-compose.doppler.yml' -- docker-compose -f docker-compose.doppler.yml up "$@"