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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-2xl glass-modal rounded-3xl p-6 sm:p-8 border border-gray-800 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Direct S3 Browser Upload</h3>
              <p className="text-xs text-gray-400">Upload high-res media directly to private AWS S3 bucket</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white bg-gray-900 border border-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drag & Drop File Selector */}
          <div className="border-2 border-dashed border-gray-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center bg-gray-900/40 hover:bg-gray-900/80 transition cursor-pointer relative">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex items-center justify-center space-x-2 text-indigo-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-200">Click or drag images & videos here</p>
                <p className="text-xs text-gray-400">Supports RAW, JPEG, PNG, WEBP, MP4, MOV up to 10 GB</p>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300">Media Asset Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Delhi Festival Celebration 2026"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Taxonomy Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>Country</span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-purple-400" />
                <span>Year</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-purple-400" />
                <span>City</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-pink-400" />
                <span>Event</span>
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-emerald-400" />
                <span>Festival</span>
              </label>
              <input
                type="text"
                value={festival}
                onChange={(e) => setFestival(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Custom Keywords</span>
              </label>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="stage, crowd, speaker"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200"
              />
            </div>
          </div>

          {/* Progress Indicator */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-indigo-300 font-semibold">
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold text-sm shadow-glow transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading directly to S3...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Start Direct S3 Upload</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
