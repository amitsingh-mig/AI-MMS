#!/bin/bash
set -e

echo "=== Starting AI-MMS Production Deployment ==="

# Pull latest containers or build locally
docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Deployment successful! System live on port 80 ==="
