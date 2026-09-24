'use client';

import React from 'react';
import { MediaAsset } from '../lib/api';
import { X, Download, Sparkles, MapPin, Calendar, Tag, RefreshCw, Eye, FileText, CheckCircle2, Shield } from 'lucide-react';

interface MediaLightboxProps {
  asset: MediaAsset | null;
  onClose: () => void;
  onDownload: (asset: MediaAsset) => void;
  onRescan: (asset: MediaAsset) => void;
  userRole?: string;
}

export default function MediaLightbox({ asset, onClose, onDownload, onRescan, userRole }: MediaLightboxProps) {
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-6xl glass-modal rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col lg:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white transition border border-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Media Preview Display */}
        <div className="w-full lg:w-3/5 bg-black flex items-center justify-center relative min-h-[350px] lg:min-h-[550px] p-6">
          {asset.previewUrl || asset.downloadUrl ? (
            asset.fileType === 'VIDEO' ? (
              <video
                src={asset.downloadUrl || asset.previewUrl}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <img
                src={asset.previewUrl || asset.downloadUrl}
                alt={asset.title}
                className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            )
          ) : (
            <div className="text-center p-8">
              <Sparkles className="w-16 h-16 text-indigo-400/50 mx-auto mb-4 animate-bounce" />
              <p className="text-sm font-semibold text-gray-300">Processing Media Preview...</p>
            </div>
          )}
        </div>

        {/* Right Column: Metadata & AI Scanning Details */}
        <div className="w-full lg:w-2/5 p-6 lg:p-8 flex flex-col justify-between overflow-y-auto space-y-6 bg-gray-950/60 border-l border-gray-800/80">
          <div className="space-y-6">
            {/* Asset Header */}
            <div>
              <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>AI Scanned Media Asset</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{asset.title}</h2>
              <p className="text-xs text-gray-400 font-mono mt-1">{asset.originalFileName}</p>
            </div>

            {/* Taxonomy Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Location</p>
                  <p className="font-semibold text-gray-200">{asset.city || 'Delhi'}, {asset.country || 'India'}</p>
                </div>
              </div>

              <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Year / Date</p>
                  <p className="font-semibold text-gray-200">{asset.year || 2026}</p>
                </div>
              </div>

              <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-pink-400" />
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Event / Festival</p>
                  <p className="font-semibold text-gray-200">{asset.event || asset.festival || 'Festival'}</p>
                </div>
              </div>

              <div className="bg-gray-900/80 p-2.5 rounded-xl border border-gray-800 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">File Size</p>
                  <p className="font-semibold text-gray-200">{(Number(asset.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
            </div>

            {/* AI Summary Description */}
            {asset.aiDescription && (
              <div className="bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-2xl space-y-1.5">
                <h4 className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Description & Context</span>
                </h4>
                <p className="text-xs text-indigo-100 leading-relaxed">{asset.aiDescription}</p>
              </div>
            )}

            {/* Detected Objects with Confidence */}
            {asset.detectedObjects && Array.isArray(asset.detectedObjects) && asset.detectedObjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Detected Rekognition Objects</h4>
                <div className="flex flex-wrap gap-1.5">
                  {asset.detectedObjects.map((obj: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-900 border border-gray-800 text-gray-200 flex items-center space-x-1"
                    >
                      <span>{obj.name}</span>
                      <span className="text-[10px] text-indigo-400 font-bold">{obj.confidence}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* OCR Extracted Text */}
            {asset.ocrText && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Extracted OCR Text</h4>
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 font-mono text-xs text-amber-300">
                  {asset.ocrText}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-800 space-y-3">
            <button
              onClick={() => onDownload(asset)}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold text-sm shadow-glow transition transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Resolution Asset</span>
            </button>

            {userRole && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
              <button
                onClick={() => onRescan(asset)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-medium text-xs border border-gray-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Trigger AI Re-scan Job</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
