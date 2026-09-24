# PIX AI Media Management System (AI-MMS)

Production-ready, ultra-fast **AI Media Management System** architected specifically for high-capacity **5–20 TB** image and video libraries.

---

## Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Next.js 15 Frontend    │
                          │   (Tailwind CSS + TS)    │
                          └─────────────┬────────────┘
                                        │ (Direct Pre-Signed S3 Upload / Download)
                                        ▼
┌──────────────────┐             ┌──────────────┐            ┌────────────────────┐
│   Nginx Proxy    ├────────────►│  NestJS API  ├───────────►│  PostgreSQL 16     │
│   (Port 80)      │             │  (Port 4000) │            │  (+ pgvector)      │
└──────────────────┘             └──────┬───────┘            └────────────────────┘
                                        │
                                        ▼
                                 ┌──────────────┐            ┌────────────────────┐
                                 │ Redis Cache  ├───────────►│  BullMQ Worker     │
                                 │  + Queue     │            │  (Sharp + FFmpeg)  │
                                 └──────────────┘            └──────────┬─────────┘
                                                                        │
                                                                        ▼
                                                             ┌────────────────────┐
                                                             │ AWS Rekognition    │
                                                             │ + AWS Bedrock AI   │
                                                             └────────────────────┘
```

---

## Tech Stack Summary

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend:** NestJS + Node.js 22 + TypeScript
- **Database:** PostgreSQL 16 + Prisma ORM + `pgvector` extension
- **Cache & Queue:** Redis 7 + BullMQ
- **AI Scanning:** AWS Rekognition (Object detection, OCR, Landmarks) + AWS Bedrock (Vector Embeddings & Natural Language Analysis) with built-in Mock AI Fallback Mode
- **Storage:** AWS S3 (Direct browser upload using pre-signed URLs)
- **CDN:** AWS CloudFront
- **Image & Video Processing:** Sharp + FFmpeg
- **Reverse Proxy:** Nginx
- **Containerization & Deployment:** Docker + Docker Compose
- **CI/CD:** GitHub Actions + GitHub Container Registry (GHCR)

---

## Key Features

1. **Direct Browser-to-S3 Upload (Pre-signed URLs):** Upload large images and raw 4K videos directly to private AWS S3 without overloading backend API servers.
2. **Hybrid pgvector AI Search:** Search 20 TB libraries using natural language prompts like `"Delhi 2026 festival photos with crowd"` using sub-millisecond vector similarity (`<=>` distance operator).
3. **Structured Taxonomy Albums:** Filter assets by:
   - **Country:** India
   - **Year:** 2025, 2026
   - **City:** Delhi, Agra, Mumbai, Jaipur
   - **Event & Festival:** Diwali, Holi, Conference, Exhibition
   - **Custom Keywords & Media Types**
4. **Minimal AWS API Usage:** Images are analyzed **ONCE** during upload. Results are stored in PostgreSQL & Redis, preventing repeated S3 listing or re-scanning.
5. **Role-Based Access Control (RBAC):**
   - `ADMIN`: Full management of uploads, deletes, secure downloads, users, roles, and audit logs.
   - `MANAGER`: Upload, download, and manage assigned media & albums.
   - `USER`: Search, view, and secure download.
6. **Audit Logs & Secure Signed Downloads:** Every download generates a short-lived pre-signed URL and logs an audit record.

---

## Quick Start with Docker Compose

To launch the complete multi-container system (PostgreSQL + pgvector, Redis, NestJS, BullMQ Worker, Next.js, Nginx):

```bash
# 1. Clone the repository
git clone https://github.com/your-username/AI_MMS.git
cd AI_MMS

# 2. Launch all services via Docker Compose
docker-compose up --build -d
```

Access the application:
- **Web Interface:** `http://localhost` (or `http://localhost:3000`)
- **Backend API:** `http://localhost/api` (or `http://localhost:4000/api`)

---

## Default Login Credentials (Seeded Automatically)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@aimms.com` | `Admin@123` |
| **Manager** | `manager@aimms.com` | `Manager@123` |
| **User** | `user@aimms.com` | `User@123` |

---

## Development Setup (Without Docker)

### 1. Backend (NestJS)
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

### 2. Worker (BullMQ)
```bash
cd worker
npm install
npm run dev
```

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

---

## GitHub Actions CI/CD

The workflow `.github/workflows/ci-cd.yml` automates:
- TypeScript linting & building for backend, worker, and frontend.
- Building multi-architecture Docker images.
- Pushing production containers to **GitHub Container Registry (GHCR)** on pushes to `main`.
