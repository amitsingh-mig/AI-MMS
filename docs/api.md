# AI-MMS REST API Reference

Base URL: `/api/v1`

## Authentication
* `POST /auth/login`: Authenticate user and return JWT bearer token & role details.
* `POST /auth/register`: Create user account (Admin required or initial setup).
* `GET /auth/me`: Get profile of authenticated user.

## Media Management
* `POST /media/presigned-url`: Request pre-signed S3 upload URL for direct browser upload.
* `POST /media/confirm-upload`: Register media asset in PostgreSQL and enqueue BullMQ AI background job.
* `GET /media/:id`: Retrieve details and metadata for a media asset.
* `GET /media/:id/download`: Request temporary pre-signed URL for direct high-speed download.
* `DELETE /media/:id`: Delete media asset (Admin only).
* `POST /media/:id/rescan`: Enqueue manual AI re-scan job (Admin/Manager).

## Search Engine
* `GET /search`: Hybrid search supporting both taxonomical filters and AI semantic vector queries.
  * Query parameters:
    * `q`: Semantic text prompt (e.g. "Delhi 2026 festival photos with crowd")
    * `country`: Country filter (e.g. "India")
    * `year`: Capture/event year (e.g. 2026)
    * `city`: City filter (e.g. "Delhi", "Agra")
    * `event`: Event tag (e.g. "Conference", "Festival")
    * `festival`: Festival tag (e.g. "Diwali")
    * `mediaType`: "IMAGE" or "VIDEO"
    * `keyword`: Custom keyword or tag

## Albums
* `GET /albums`: List all albums with taxonomy counters.
* `POST /albums`: Create a new album (Admin/Manager).
* `GET /albums/:id`: Get album details and associated media assets.

## Dashboard & System Logs
* `GET /dashboard/stats`: System metrics (Total media count, total file size, AI queue status, storage usage).
* `GET /audit-logs`: Audit trail for compliance (Uploads, downloads, deletes, role updates).
