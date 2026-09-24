import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('aimms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface MediaAsset {
  id: string;
  title: string;
  originalFileName: string;
  fileType: 'IMAGE' | 'VIDEO';
  mimeType: string;
  fileSizeBytes: string;
  s3Key: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  albumId?: string;
  albumName?: string;
  country?: string;
  year?: number;
  city?: string;
  event?: string;
  festival?: string;
  customKeywords?: string[];
  aiDescription?: string;
  aiKeywords?: string[];
  ocrText?: string;
  detectedObjects?: any[];
  detectedLandmarks?: any[];
  thumbnailS3Key?: string;
  previewS3Key?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
}

export default api;
