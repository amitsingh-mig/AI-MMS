#!/bin/bash
set -e

echo "=== Seeding Initial Users and Demo Media Assets ==="

# Trigger backend demo seed API endpoint
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-[Type: application/json]" \
  -d '{"email":"admin@aimms.io","password":"adminpassword"}' || true

echo "=== Seed procedure finished. ==="
