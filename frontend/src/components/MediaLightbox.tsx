'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MediaAsset } from '../lib/api';
import api from '../lib/api';
import {
  X, Download, Sparkles, MapPin, Calendar, Tag, RefreshCw,
  FileText, Trash2, HardDrive, Image as ImageIcon, AlertCircle,
  RotateCcw, Database, FolderOpen, User, Clock, CheckCircle2,
  Loader2, Eye, Film,
} from 'lucide-react';

interface MediaLightboxProps {
  asset: MediaAsset | null;
  onClose: () => void;
  onDownload: (asset: MediaAsset) => void;
  onRescan: (asset: MediaAsset) => void;
  onDelete?: (asset: MediaAsset) => void;
  userRole?: string;
}

function MetaRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-gray-800/60 last:border-0">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0 w-28">{label}</span>
      <span className="text-xs font-semibold text-gray-200 text-right break-all">
        {value !== null && value !== undefined && value !== '' ? String(value) : (
          <span className="text-gray-600 italic font-normal">Not available</span>
        )}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 pt-4 pb-1 border-b border-gray-800">
      {children}
    </h4>
  );
}

export default function MediaLightbox({
  asset,
  onClose,
  onDownload,
  onRescan,
  onDelete,
  userRole,
}: MediaLightboxProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [fullAsset, setFullAsset] = useState<any | null>(null);
  const [activeSection, setActiveSection] = useState<'info' | 'ai' | 'storage'>('info');

  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER';
  const canManage = isAdmin || isManager;

  const loadPreview = useCallback(async () => {
    if (!asset) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setImageLoadError(false);
    setPreviewUrl(null);

    try {
      // 1. Try the dedicated /preview endpoint (validates S3 existence)
      const encodedId = encodeURIComponent(asset.id);
      const res = await api.get(`/media/${encodedId}/preview`);
      if (res.data?.url) {
        setPreviewUrl(res.data.url);
        setPreviewLoading(false);
        return;
      }
    } catch {
      // fall through to asset URLs
    }

    // 2. Fallback to signed URLs already attached to the asset
    const fallbackUrl = asset.previewUrl || asset.thumbnailUrl || asset.downloadUrl;
    if (fallbackUrl) {
      setPreviewUrl(fallbackUrl);
    } else {
      setPreviewError('No preview URL available. The S3 object may not exist.');
    }
    setPreviewLoading(false);
  }, [asset]);

  const loadFullAsset = useCallback(async () => {
    if (!asset) return;
    try {
      const encodedId = encodeURIComponent(asset.id);
      const res = await api.get(`/media/${encodedId}`);
      setFullAsset(res.data);
    } catch {
      setFullAsset(null);
    }
  }, [asset]);

  useEffect(() => {
    if (asset) {
      setFullAsset(null);
      loadPreview();
      loadFullAsset();
    }
  }, [asset, loadPreview, loadFullAsset]);

  if (!asset) return null;

  const data = fullAsset || asset;

  const isAIScanned =
    data.processingStatus === 'COMPLETED' &&
    (Boolean(data.aiDescription) ||
      (data.aiKeywords && data.aiKeywords.length > 0) ||
      Boolean(data.ocrText));

  const fileSizeMB = data.fileSizeBytes
    ? (Number(data.fileSizeBytes) / (1024 * 1024)).toFixed(2) + ' MB'
    : null;

  const formatDate = (d?: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleString(); } catch { return null; }
  };

  const mimeDisplay = data.mimeType
    ? data.mimeType.split('/').pop()?.toUpperCase()
    : data.fileType;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/85 backdrop-blur-xl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-6xl bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col lg:flex-row max-h-[95vh]">
        
        {/* ── Close Button ── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-gray-900/90 hover:bg-gray-800 text-gray-400 hover:text-white transition border border-gray-700"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ══════════════════════════════════════════════
            LEFT — Media Preview
        ══════════════════════════════════════════════ */}
        <div className="w-full lg:w-[60%] bg-black flex items-center justify-center relative min-h-[280px] lg:min-h-[600px]">
          
          {previewLoading && (
            <div className="flex flex-col items-center justify-center space-y-3 p-8 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
              <p className="text-sm font-semibold">Loading preview from S3...</p>
            </div>
          )}

          {!previewLoading && previewError && !previewUrl && (
            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-300">Unable to load preview</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">{previewError}</p>
              </div>
              <button
                onClick={loadPreview}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Preview</span>
              </button>
            </div>
          )}

          {!previewLoading && previewUrl && (
            <>
              {data.fileType === 'VIDEO' ? (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  className="max-h-[90%] max-w-full rounded-lg object-contain shadow-2xl"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <>
                  {!imageLoadError ? (
                    <img
                      key={previewUrl}
                      src={previewUrl}
                      alt={data.title || data.originalFileName}
                      className="max-h-[90%] max-w-full rounded-lg object-contain shadow-2xl"
                      onError={() => {
                        setImageLoadError(true);
                        setPreviewError('Image failed to load from S3. The object may have expired or does not exist.');
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-300">Image failed to render</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs">
                          The signed URL may have expired. Click retry to regenerate.
                        </p>
                      </div>
                      <button
                        onClick={loadPreview}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Preview</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* File type watermark badge */}
          <div className="absolute top-3 left-3">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-black/70 border border-gray-700 text-white backdrop-blur">
              {data.fileType === 'VIDEO' ? (
                <><Film className="w-3 h-3 text-amber-400" /><span>Video</span></>
              ) : (
                <><ImageIcon className="w-3 h-3 text-amber-400" /><span>Image</span></>
              )}
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            RIGHT — Metadata Panel
        ══════════════════════════════════════════════ */}
        <div className="w-full lg:w-[40%] flex flex-col bg-gray-950 border-l border-gray-800 overflow-y-auto">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-800">
            {isAIScanned && (
              <div className="flex items-center space-x-1.5 text-[10px] text-indigo-400 font-bold mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Scanned</span>
              </div>
            )}
            <h2 className="text-base font-extrabold text-white leading-tight break-all">
              {data.title || data.originalFileName}
            </h2>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5 break-all">
              {data.originalFileName}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-800 px-4 pt-3 gap-1">
            {(['info', 'ai', 'storage'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSection(tab)}
                className={`px-3 py-1.5 rounded-t-lg text-[10px] font-extrabold uppercase tracking-wider transition ${
                  activeSection === tab
                    ? 'bg-gray-800 text-amber-400 border border-gray-700 border-b-gray-800'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'info' ? '📋 Details' : tab === 'ai' ? '🤖 AI' : '💾 Storage'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-4 space-y-1 overflow-y-auto">

            {/* ── INFO TAB ── */}
            {activeSection === 'info' && (
              <div className="space-y-1">
                <SectionTitle>File Information</SectionTitle>
                <MetaRow label="File Name" value={data.originalFileName} />
                <MetaRow label="File Type" value={mimeDisplay} />
                <MetaRow label="File Size" value={fileSizeMB} />
                <MetaRow
                  label="Dimensions"
                  value={data.width && data.height ? `${data.width} × ${data.height} px` : null}
                />
                <MetaRow
                  label="Duration"
                  value={data.durationSeconds ? `${data.durationSeconds}s` : null}
                />
                <MetaRow label="Upload Date" value={formatDate(data.createdAt)} />
                <MetaRow label="Uploaded By" value={data.uploadedByName || data.uploadedBy?.name || null} />

                <SectionTitle>Classification</SectionTitle>
                <MetaRow label="Album" value={data.albumName || data.album?.name || null} />
                <MetaRow label="Country" value={data.country} />
                <MetaRow label="Year" value={data.year} />
                <MetaRow label="City" value={data.city} />
                <MetaRow label="Event" value={data.event} />
                <MetaRow label="Festival" value={data.festival} />
                {data.customKeywords && data.customKeywords.length > 0 && (
                  <div className="py-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custom Keywords</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {data.customKeywords.map((kw: string) => (
                        <span key={kw} className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <SectionTitle>Camera & EXIF</SectionTitle>
                <MetaRow label="Capture Date" value={formatDate(data.captureDate)} />
                <MetaRow label="Camera Make" value={data.cameraMake} />
                <MetaRow label="Camera Model" value={data.cameraModel} />
                <MetaRow label="Lens Model" value={data.lensModel} />
                <MetaRow label="Focal Length" value={data.focalLength ? `${data.focalLength} mm` : null} />
                <MetaRow label="Aperture" value={data.aperture ? `f/${data.aperture}` : null} />
                <MetaRow label="Shutter Speed" value={data.shutterSpeed ? `${data.shutterSpeed}s` : null} />
                <MetaRow label="ISO" value={data.iso} />
                {(data.gpsLatitude !== null && data.gpsLongitude !== null) ? (
                  <MetaRow label="GPS Location" value={`${data.gpsLatitude}, ${data.gpsLongitude}`} />
                ) : (
                  <MetaRow label="GPS Location" value={null} />
                )}

                <SectionTitle>Processing</SectionTitle>
                <MetaRow label="AI Scan Status" value={data.processingStatus} />
                {data.processingError && (
                  <MetaRow label="Error" value={data.processingError} />
                )}
              </div>
            )}

            {/* ── AI TAB ── */}
            {activeSection === 'ai' && (
              <div className="space-y-3">
                <SectionTitle>AI Analysis</SectionTitle>

                {!isAIScanned && (
                  <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
                    <Sparkles className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-semibold">
                      {data.processingStatus === 'PENDING'
                        ? 'AI scan is pending. Use AI Re-scan to trigger analysis.'
                        : data.processingStatus === 'PROCESSING'
                        ? 'AI scan in progress...'
                        : 'No AI data available. Use AI Re-scan to analyze this media.'}
                    </p>
                  </div>
                )}

                {data.aiDescription && (
                  <div className="bg-indigo-950/30 border border-indigo-500/20 p-3.5 rounded-xl">
                    <h5 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" /><span>AI Description</span>
                    </h5>
                    <p className="text-xs text-indigo-100 leading-relaxed">{data.aiDescription}</p>
                  </div>
                )}

                {data.aiKeywords && data.aiKeywords.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">AI Keywords</h5>
                    <div className="flex flex-wrap gap-1">
                      {data.aiKeywords.map((kw: string) => (
                        <span key={kw} className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-400/10 text-purple-300 border border-purple-400/20">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.detectedObjects && Array.isArray(data.detectedObjects) && data.detectedObjects.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Detected Objects</h5>
                    <div className="flex flex-wrap gap-1">
                      {data.detectedObjects.map((obj: any, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-200 border border-gray-700 flex items-center space-x-1">
                          <span>{obj.name || obj}</span>
                          {obj.confidence && <span className="text-indigo-400">{obj.confidence}%</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.detectedLandmarks && Array.isArray(data.detectedLandmarks) && data.detectedLandmarks.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Detected Landmarks</h5>
                    <div className="flex flex-wrap gap-1">
                      {data.detectedLandmarks.map((lm: any, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-200 border border-gray-700">
                          {lm.name || lm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.ocrText && (
                  <div>
                    <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">OCR Extracted Text</h5>
                    <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 font-mono text-[11px] text-amber-300 leading-relaxed max-h-32 overflow-y-auto">
                      {data.ocrText}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STORAGE TAB ── */}
            {activeSection === 'storage' && (
              <div className="space-y-1">
                <SectionTitle>S3 Storage</SectionTitle>
                <MetaRow label="Bucket" value={data.s3Bucket || 'ai-pics-mig'} />
                <MetaRow label="S3 Key" value={data.s3Key} />
                <MetaRow label="Preview Key" value={data.previewS3Key} />
                <MetaRow label="Thumbnail Key" value={data.thumbnailS3Key} />
                <MetaRow label="Resolved Preview" value={data.resolvedPreviewKey} />

                <SectionTitle>Record</SectionTitle>
                <MetaRow label="Asset ID" value={data.id} />
                <MetaRow label="MIME Type" value={data.mimeType} />
                <MetaRow label="Created" value={formatDate(data.createdAt)} />
                <MetaRow label="Updated" value={formatDate(data.updatedAt)} />
              </div>
            )}
          </div>

          {/* ── Action Footer ── */}
          <div className="p-4 border-t border-gray-800 space-y-2.5">
            <button
              onClick={() => onDownload(asset)}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#FFD600] hover:bg-yellow-400 text-slate-950 font-extrabold text-sm shadow-md transition active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Download Original S3 File</span>
            </button>

            <div className="flex items-center gap-2">
              {canManage && (
                <button
                  onClick={() => onRescan(asset)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold text-xs border border-gray-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Re-scan</span>
                </button>
              )}

              <button
                onClick={loadPreview}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold text-xs border border-gray-700 transition"
                title="Refresh preview URL"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Refresh</span>
              </button>

              {onDelete && isAdmin && (
                <button
                  onClick={() => onDelete(asset)}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-semibold text-xs border border-rose-500/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
