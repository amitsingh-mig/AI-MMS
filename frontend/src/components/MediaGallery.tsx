'use client';

import React from 'react';
import { MediaAsset } from '../lib/api';
import { Play, Sparkles, Download, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface MediaGalleryProps {
  assets: MediaAsset[];
  loading: boolean;
  onSelectAsset: (asset: MediaAsset) => void;
  onDownloadAsset: (asset: MediaAsset) => void;
}

export default function MediaGallery({ assets, loading, onSelectAsset, onDownloadAsset }: MediaGalleryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-gray-800/40 border border-gray-800 animate-pulse flex flex-col justify-end p-4 space-y-2"
          >
            <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700/30 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="w-full glass-panel rounded-2xl p-12 text-center space-y-4 border border-gray-800 my-4">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-200">No Media Assets Found</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Try adjusting your search prompt or clear active taxonomy filters to view available media.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {assets.map((asset) => (
        <div
          key={asset.id}
          onClick={() => onSelectAsset(asset)}
          className="group relative h-64 rounded-2xl overflow-hidden glass-panel border border-gray-800 hover:border-indigo-500/50 transition-all duration-300 shadow-md hover:shadow-glow cursor-pointer flex flex-col justify-between"
        >
          {/* Media Thumbnail Container */}
          <div className="absolute inset-0 bg-gray-900 overflow-hidden">
            {asset.previewUrl || asset.thumbnailUrl ? (
              <img
                src={asset.previewUrl || asset.thumbnailUrl}
                alt={asset.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex items-center justify-center p-6 text-center">
                <div>
                  <Sparkles className="w-10 h-10 text-indigo-400/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-400 truncate max-w-[180px]">{asset.title}</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
          </div>

          {/* Top Badges */}
          <div className="relative z-10 p-3 flex items-center justify-between">
            {/* Media Type Badge */}
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-gray-900/80 backdrop-blur text-gray-200 border border-gray-700/50 flex items-center space-x-1">
              {asset.fileType === 'VIDEO' ? (
                <>
                  <Play className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                  <span>Video</span>
                </>
              ) : (
                <span>Image</span>
              )}
            </span>

            {/* Processing Status Badge */}
            {asset.processingStatus === 'COMPLETED' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>AI Scanned</span>
              </span>
            ) : asset.processingStatus === 'PROCESSING' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1 animate-pulse">
                <Clock className="w-3 h-3" />
                <span>Scanning...</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                Pending
              </span>
            )}
          </div>

          {/* Bottom Info Overlay */}
          <div className="relative z-10 p-4 space-y-2">
            <div>
              <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition">
                {asset.title}
              </h4>
              <p className="text-[11px] text-gray-400 flex items-center space-x-1 mt-0.5">
                <span>{asset.city || 'India'}</span>
                <span>•</span>
                <span>{asset.year || 2026}</span>
                {asset.event && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-400">{asset.event}</span>
                  </>
                )}
              </p>
            </div>

            {/* AI Keywords tags */}
            {asset.aiKeywords && asset.aiKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {asset.aiKeywords.slice(0, 3).map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded text-[9px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
              <span className="text-[10px] text-gray-400 font-mono">
                {(Number(asset.fileSizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadAsset(asset);
                }}
                className="p-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white transition shadow"
                title="Secure Signed Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
