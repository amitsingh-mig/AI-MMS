#!/bin/bash
set -e

echo "=== Initializing AI-MMS Database & pgvector Extension ==="

cd backend
npx prisma db push --skip-generate
npx prisma generate

echo "=== Database schema pushed and Prisma client generated successfully! ==="
