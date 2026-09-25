'use client';

import React from 'react';
import { MediaAsset } from '../lib/api';
import { Play, Sparkles, Download, CheckCircle2, Clock, Image as ImageIcon, Inbox } from 'lucide-react';

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
            className="h-64 rounded-2xl bg-slate-100 border border-gray-200 animate-pulse flex flex-col justify-end p-4 space-y-2"
          >
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl p-12 text-center space-y-4 border border-gray-200 shadow-sm my-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center border border-slate-200">
          <Inbox className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">No media found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No real media assets found matching your criteria. Upload images or videos to your AWS S3 bucket to populate the library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {assets.map((asset) => {
        const imageUrl = asset.thumbnailUrl || asset.previewUrl || asset.downloadUrl;
        const hasLocationOrYear = Boolean(asset.city || asset.country || asset.year || asset.event);
        const isAIScanned = asset.processingStatus === 'COMPLETED' && (Boolean(asset.aiDescription) || (asset.aiKeywords && asset.aiKeywords.length > 0) || Boolean(asset.ocrText));

        return (
          <div
            key={asset.id}
            onClick={() => onSelectAsset(asset)}
            className="group relative h-64 rounded-2xl overflow-hidden bg-slate-900 border border-gray-200 hover:border-amber-400 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
          >
            {/* Media Image Container */}
            <div className="absolute inset-0 bg-slate-900 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={asset.title || asset.originalFileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-slate-500 space-y-2">
                  <ImageIcon className="w-10 h-10 stroke-[1.5]" />
                  <span className="text-[11px] font-mono">{asset.originalFileName}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity"></div>
            </div>

            {/* Top Badges */}
            <div className="relative z-10 p-3 flex items-center justify-between">
              {/* Media Type Badge */}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-slate-900/80 backdrop-blur text-white border border-slate-700 flex items-center space-x-1">
                {asset.fileType === 'VIDEO' ? (
                  <>
                    <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>Video</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-2.5 h-2.5 text-amber-400" />
                    <span>Image</span>
                  </>
                )}
              </span>

              {/* Processing Status Badge - ONLY if actually scanned */}
              {isAIScanned ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>AI Scanned</span>
                </span>
              ) : asset.processingStatus === 'PROCESSING' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur flex items-center space-x-1 animate-pulse">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Scanning...</span>
                </span>
              ) : null}
            </div>

            {/* Bottom Details Overlay */}
            <div className="relative z-10 p-4 space-y-2">
              <div>
                <h4 className="text-sm font-extrabold text-white line-clamp-1 group-hover:text-amber-300 transition">
                  {asset.title || asset.originalFileName}
                </h4>
                {hasLocationOrYear && (
                  <p className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1 mt-0.5">
                    {asset.city && <span>{asset.city}</span>}
                    {asset.city && asset.country && <span>, </span>}
                    {asset.country && <span>{asset.country}</span>}
                    {asset.year && (
                      <>
                        <span>•</span>
                        <span>{asset.year}</span>
                      </>
                    )}
                    {asset.event && (
                      <>
                        <span>•</span>
                        <span className="text-amber-300 font-bold">{asset.event}</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* AI Keyword Tags */}
              {asset.aiKeywords && asset.aiKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {asset.aiKeywords.slice(0, 3).map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30 backdrop-blur"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <span className="text-[10px] text-slate-300 font-mono font-semibold">
                  {asset.fileSizeBytes ? (Number(asset.fileSizeBytes) / (1024 * 1024)).toFixed(1) : '0.0'} MB
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadAsset(asset);
                  }}
                  className="p-1.5 rounded-xl bg-[#FFD600] hover:bg-yellow-400 text-slate-950 font-bold transition shadow-sm"
                  title="Download S3 Asset"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
