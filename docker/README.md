# AI-MMS Docker Infrastructure

This directory contains containerization manifests and Docker environment settings for AI-MMS.

## Included Containers
* `postgres`: PostgreSQL 16 with `pgvector` extension enabled (`pgvector/pgvector:pg16`).
* `redis`: Redis 7 Alpine caching engine and BullMQ queue broker (`redis:7-alpine`).
* `backend`: NestJS application container running REST API endpoints on port 4000.
* `worker`: BullMQ background processing worker for async Sharp, FFmpeg, Rekognition, and vector generation.
* `frontend`: Next.js 15 SSR dashboard and virtualized media gallery on port 3000.
* `nginx`: High-performance Nginx reverse proxy serving port 80/443.

## Launch Instructions
```bash
# Development / Local Docker Stack
docker compose up -d

# Production Docker Stack
docker compose -f docker-compose.prod.yml up -d
```
