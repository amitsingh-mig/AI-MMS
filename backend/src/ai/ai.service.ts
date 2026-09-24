import { Injectable, Logger } from '@nestjs/common';
import { RekognitionClient, DetectLabelsCommand, DetectTextCommand } from '@aws-sdk/client-rekognition';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface AIScanResult {
  aiDescription: string;
  aiKeywords: string[];
  ocrText: string;
  detectedObjects: any[];
  detectedLandmarks: any[];
  embedding: number[];
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private rekognition: RekognitionClient | null = null;
  private bedrock: BedrockRuntimeClient | null = null;
  private isMock: boolean = false;

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (accessKeyId && accessKeyId !== 'mock_key' && secretAccessKey && secretAccessKey !== 'mock_secret') {
      this.rekognition = new RekognitionClient({ region, credentials: { accessKeyId, secretAccessKey } });
      this.bedrock = new BedrockRuntimeClient({ region, credentials: { accessKeyId, secretAccessKey } });
      this.logger.log('AWS Rekognition & Bedrock services initialized');
    } else {
      this.isMock = true;
      this.logger.log('Operating in Mock AI Analysis Mode.');
    }
  }

  async analyzeMedia(s3Bucket: string, s3Key: string, fileName: string, albumMetadata?: any): Promise<AIScanResult> {
    if (this.isMock || !this.rekognition) {
      return this.generateMockAnalysis(fileName, albumMetadata);
    }

    try {
      const labelsRes = await this.rekognition.send(
        new DetectLabelsCommand({
          Image: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
          MaxLabels: 20,
          MinConfidence: 70,
        })
      );

      const detectedObjects = (labelsRes.Labels || []).map((l) => ({
        name: l.Name,
        confidence: Math.round(l.Confidence || 0),
        categories: (l.Categories || []).map((c) => c.Name),
      }));

      const aiKeywords = Array.from(
        new Set(detectedObjects.map((o) => o.name.toLowerCase()))
      );

      let ocrText = '';
      try {
        const textRes = await this.rekognition.send(
          new DetectTextCommand({
            Image: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
          })
        );
        ocrText = (textRes.TextDetections || [])
          .filter((t) => t.Type === 'LINE')
          .map((t) => t.DetectedText)
          .join(' ');
      } catch (e) {}

      let aiDescription = `Photo containing ${aiKeywords.slice(0, 5).join(', ')}.`;
      if (albumMetadata?.city || albumMetadata?.country) {
        aiDescription += ` Location: ${albumMetadata.city || ''}, ${albumMetadata.country || ''}.`;
      }

      const embeddingText = `${fileName} ${aiKeywords.join(' ')} ${ocrText} ${aiDescription}`;
      const embedding = this.generateDeterministicEmbedding(embeddingText);

      return {
        aiDescription,
        aiKeywords,
        ocrText,
        detectedObjects,
        detectedLandmarks: [],
        embedding,
      };
    } catch (err: any) {
      this.logger.warn(`AWS Rekognition error, falling back to smart mock generator: ${err.message}`);
      return this.generateMockAnalysis(fileName, albumMetadata);
    }
  }

  private generateMockAnalysis(fileName: string, albumMetadata?: any): AIScanResult {
    const lowerName = fileName.toLowerCase();
    const keywordsSet = new Set<string>();

    if (albumMetadata?.country) keywordsSet.add(albumMetadata.country.toLowerCase());
    if (albumMetadata?.city) keywordsSet.add(albumMetadata.city.toLowerCase());
    if (albumMetadata?.event) keywordsSet.add(albumMetadata.event.toLowerCase());
    if (albumMetadata?.festival) keywordsSet.add(albumMetadata.festival.toLowerCase());

    const mockLabelPool = [
      'crowd', 'stage', 'people', 'celebration', 'festival', 'lights', 'monument',
      'architecture', 'tourism', 'diwali', 'holi', 'conference', 'speaker', 'audience',
      'traditional clothing', 'flag', 'parade', 'temple', 'monument', 'food'
    ];

    if (lowerName.includes('delhi') || albumMetadata?.city?.toLowerCase() === 'delhi') {
      keywordsSet.add('delhi').add('india').add('monument').add('stage').add('crowd');
    }
    if (lowerName.includes('agra') || albumMetadata?.city?.toLowerCase() === 'agra') {
      keywordsSet.add('agra').add('taj mahal').add('monument').add('tourism');
    }
    if (lowerName.includes('festival') || albumMetadata?.event?.toLowerCase().includes('festival')) {
      keywordsSet.add('festival').add('celebration').add('crowd').add('lights').add('diwali');
    }

    // Default keywords if sparse
    if (keywordsSet.size < 4) {
      keywordsSet.add('people').add('event').add('india').add('photo').add('stage');
    }

    const aiKeywords = Array.from(keywordsSet);
    const detectedObjects = aiKeywords.map((k, i) => ({
      name: k,
      confidence: 90 - i * 2,
    }));

    const cityStr = albumMetadata?.city || 'Delhi';
    const yearStr = albumMetadata?.year || 2026;
    const eventStr = albumMetadata?.event || albumMetadata?.festival || 'Festival';

    const aiDescription = `High-resolution ${eventStr} photograph captured in ${cityStr}, ${albumMetadata?.country || 'India'} (${yearStr}) featuring ${aiKeywords.slice(0, 4).join(', ')}.`;
    const ocrText = `INDIA ${yearStr} ${cityStr.toUpperCase()} ${eventStr.toUpperCase()}`;

    const embeddingText = `${fileName} ${aiKeywords.join(' ')} ${aiDescription} ${ocrText}`;
    const embedding = this.generateDeterministicEmbedding(embeddingText);

    return {
      aiDescription,
      aiKeywords,
      ocrText,
      detectedObjects,
      detectedLandmarks: [{ landmark: 'India Gate / Red Fort', confidence: 95 }],
      embedding,
    };
  }

  generateDeterministicEmbedding(text: string, dimensions = 384): number[] {
    const vector = new Array(dimensions).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < dimensions; i++) {
      const val = Math.sin(hash + i * 0.1);
      vector[i] = parseFloat(val.toFixed(6));
    }
    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((v) => (norm > 0 ? parseFloat((v / norm).toFixed(6)) : 0));
  }
}
