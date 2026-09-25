'use client';

import React, { useState } from 'react';
import api from '../lib/api';
import { X, UploadCloud, CheckCircle2, AlertCircle, Loader2, Sparkles, MapPin, Calendar, Tag } from 'lucide-react';
import axios from 'axios';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('India');
  const [year, setYear] = useState('2026');
  const [city, setCity] = useState('Delhi');
  const [event, setEvent] = useState('Festival');
  const [festival, setFestival] = useState('Diwali');
  const [customKeywords, setCustomKeywords] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a photo or video file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setStatusMessage('1/3 Requesting secure S3 pre-signed upload URL...');
    setProgress(15);

    try {
      const fileType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

      // Step 1: Get pre-signed URL from NestJS API
      const presignedRes = await api.post('/media/presigned-url', {
        fileName: file.name,
        fileType,
        mimeType: file.type || (fileType === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
        fileSizeBytes: file.size,
      });

      const { presignedUrl, s3Key } = presignedRes.data;

      // Step 2: Upload directly to S3 via pre-signed URL
      setStatusMessage('2/3 Direct Browser-to-S3 Upload in progress...');
      setProgress(40);

      await axios.put(presignedUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 50) / progressEvent.total) + 40;
            setProgress(pct);
          }
        },
      });

      // Step 3: Confirm Upload with Backend & Queue BullMQ Job
      setStatusMessage('3/3 Registering asset & queuing AI scanning job...');
      setProgress(95);

      const keywordsArray = customKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      await api.post('/media/confirm-upload', {
        s3Key,
        title: title || file.name,
        originalFileName: file.name,
        fileType,
        mimeType: file.type || (fileType === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
        fileSizeBytes: file.size,
        country,
        year: parseInt(year, 10),
        city,
        event,
        festival,
        customKeywords: keywordsArray,
      });

      setProgress(100);
      setStatusMessage('Upload complete! AI scanning initiated.');
      
      setTimeout(() => {
        setUploading(false);
        onUploadSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || err.message || 'Direct S3 upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Direct S3 Browser Upload</h3>
              <p className="text-xs font-medium text-slate-500">Upload high-res media directly to private AWS S3 bucket</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drag & Drop File Selector */}
          <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-2xl p-6 text-center bg-slate-50 hover:bg-amber-50/50 transition cursor-pointer relative">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex items-center justify-center space-x-2 text-slate-900 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-extrabold text-slate-900">Click or drag images & videos here</p>
                <p className="text-xs font-medium text-slate-500">Supports RAW, JPEG, PNG, WEBP, MP4, MOV up to 10 GB</p>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700">Media Asset Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Delhi Festival Celebration 2026"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-[#FFD600] transition"
              required
            />
          </div>

          {/* Taxonomy Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-indigo-500" />
                <span>Country</span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-purple-500" />
                <span>Year</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-purple-500" />
                <span>City</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-pink-500" />
                <span>Event</span>
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-emerald-500" />
                <span>Festival</span>
              </label>
              <input
                type="text"
                value={festival}
                onChange={(e) => setFestival(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Custom Keywords</span>
              </label>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="stage, crowd, speaker"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Progress Indicator */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-700 font-extrabold">
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-[#FFD600] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-[#FFD600] hover:bg-yellow-400 text-slate-950 font-extrabold text-sm shadow-sm transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Uploading directly to S3...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-slate-950" />
                <span>Start Direct S3 Upload</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

