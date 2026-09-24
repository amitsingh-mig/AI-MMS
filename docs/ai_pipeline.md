# AI Processing Pipeline Specifications

## Step-by-Step AI Lifecycle

1. **Direct Upload Confirmation**: Browser completes upload directly to AWS S3 using pre-signed PUT URLs. Backend records metadata and pushes job payload `{ mediaId, action: 'SCAN' }` to BullMQ Redis Queue.
2. **Worker Dequeue**: Dedicated background Node.js worker pulls job from queue.
3. **Thumbnail & Preview Generation**:
   - For images: Sharp generates optimized WebP thumbnails (300px) and previews (1200px).
   - For videos: FFmpeg extracts frame thumbnail at t=1.0s and converts to WebP.
4. **AWS Rekognition Analysis**:
   - `DetectLabelsCommand`: Detects object labels, scenes, and confidence percentages.
   - `DetectTextCommand`: Extracts OCR text embedded in photos/banners.
5. **AWS Bedrock / Semantic Synthesis**:
   - Claude 3 Haiku / Bedrock generates concise description and contextual keywords based on detected objects, OCR text, and user-provided taxonomy.
6. **pgvector Embedding Computation**:
   - Generates 384-dimensional dense vector representation of the asset title, AI description, OCR text, and keywords.
7. **PostgreSQL Synchronization**:
   - Executes atomic SQL update to write `aiDescription`, `aiKeywords`, `ocrText`, `detectedObjects`, and `embedding` (`vector(384)`).
   - Sets `processingStatus = 'COMPLETED'`.
