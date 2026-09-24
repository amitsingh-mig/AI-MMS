# AI-Powered Media Management System (AI-MMS) Architecture

## Overview
AI-MMS is a enterprise-grade media management system engineered to store, index, scan, and search 5–20 Terabytes of photos, images, and videos with sub-second retrieval times and rich AI semantic search.

```
                  +-----------------------------------+
                  |        Next.js Frontend           |
                  |     (Virtualized Gallery / UI)    |
                  +-----------------+-----------------+
                                    |
                         Pre-signed Upload / Direct CDN
                                    |
   +------------------+             v             +-------------------+
   |   Nginx Reverse  |====> [ NestJS Backend ] ====>| AWS S3 Bucket     |
   |      Proxy       |       (API Controller)    | (Private Originals|
   +------------------+             |             | & Previews)       |
                                    v             +-------------------+
                          +-------------------+
                          | Redis + BullMQ    |
                          | (Async Job Queue) |
                          +---------+---------+
                                    |
                                    v
                          +-------------------+
                          | Node.js Worker    |
                          | (AI Engine)       |
                          +----+--------+-----+
                               |        |
        +----------------------+        +----------------------+
        v                                                      v
  AWS Rekognition                                        AWS Bedrock + Vector
  (Labels & OCR)                                        (Claude & Embeddings)
        |                                                      |
        +----------------------+--------+----------------------+
                               |
                               v
                     +-------------------+
                     | PostgreSQL        |
                     | (+ pgvector HNSW) |
                     +-------------------+
```

## Scalability Guidelines for 5–20 TB Scale
1. **Zero-In-Transit Media Pass-through**: Large files (up to multi-gigabyte videos) NEVER stream through the Node.js backend or frontend. Direct browser-to-S3 pre-signed upload URLs (`@aws-sdk/s3-request-presigner`) bypass backend CPU/memory bottlenecks completely.
2. **Single AI Scanning Pass**: S3 objects are scanned once upon arrival via BullMQ background workers. Results (AI descriptions, OCR text, labels, vector embeddings) are persisted in PostgreSQL with `pgvector` HNSW index.
3. **No S3 Polling for Search**: All search queries (structured filters + semantic AI vector similarity) are executed directly against PostgreSQL and cached in Redis. S3 API calls during search are **0**.
4. **CloudFront / Pre-signed Delivery**: Thumbnails and media previews are served securely via CDN with expiring signatures.
