#!/bin/bash

# Run RAG Scholar with Doppler secrets injection
# This uses doppler run to securely inject all secrets into Docker Compose

echo "🔐 Starting RAG Scholar with Doppler secrets..."
doppler run -- docker-compose up "$@"