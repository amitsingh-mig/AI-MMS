'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import api, { MediaAsset } from '../lib/api';
import Navbar from '../components/Navbar';
import FilterSidebar, { FilterState } from '../components/FilterSidebar';
import MediaGallery from '../components/MediaGallery';
import MediaLightbox from '../components/MediaLightbox';
import UploadModal from '../components/UploadModal';
import AdminDashboard from '../components/AdminDashboard';
import { Search, Sparkles, SlidersHorizontal, Image as ImageIcon, Video, ShieldCheck, Database, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading, switchRoleQuickly } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'gallery' | 'albums' | 'users' | 'audit'>('gallery');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState<FilterState>({
    country: '',
    year: '',
    city: '',
    event: '',
    festival: '',
    mediaType: '',
    keyword: '',
  });

  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Auto login default admin if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      switchRoleQuickly('ADMIN').catch(() => {});
    }
  }, [authLoading, user]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.q = searchQuery;
      if (filters.country) params.country = filters.country;
      if (filters.year) params.year = filters.year;
      if (filters.city) params.city = filters.city;
      if (filters.event) params.event = filters.event;
      if (filters.festival) params.festival = filters.festival;
      if (filters.mediaType) params.mediaType = filters.mediaType;
      if (filters.keyword) params.keyword = filters.keyword;

      const res = await api.get('/search', { params });
      let mediaItems = res.data.items || [];

      // If database has no media assets, automatically create demo assets so gallery is beautiful out of the box!
      if (mediaItems.length === 0 && !searchQuery && !filters.country && !filters.city) {
        await seedDemoAssets();
        const retryRes = await api.get('/search');
        mediaItems = retryRes.data.items || [];
      }

      setAssets(mediaItems);
    } catch (err) {
      console.error('Failed to fetch media assets:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  useEffect(() => {
    if (user) {
      fetchMedia();
    }
  }, [user, fetchMedia]);

  const seedDemoAssets = async () => {
    try {
      const demoItems = [
        {
          title: 'Delhi Festival Crowds 2026',
          originalFileName: 'delhi_festival_2026_crowd.jpg',
          fileType: 'IMAGE',
          mimeType: 'image/jpeg',
          fileSizeBytes: 4200000,
          s3Key: 'demo/delhi_festival_2026_crowd.jpg',
          country: 'India',
          year: 2026,
          city: 'Delhi',
          event: 'Festival',
          festival: 'Diwali',
          customKeywords: ['crowd', 'stage', 'lights', 'celebration'],
        },
        {
          title: 'Agra Taj Mahal Sunset 2025',
          originalFileName: 'agra_taj_mahal_2025.jpg',
          fileType: 'IMAGE',
          mimeType: 'image/jpeg',
          fileSizeBytes: 6800000,
          s3Key: 'demo/agra_taj_mahal_2025.jpg',
          country: 'India',
          year: 2025,
          city: 'Agra',
          event: 'Tourism',
          festival: 'Exhibition',
          customKeywords: ['monument', 'architecture', 'tourism', 'sunset'],
        },
        {
          title: 'India International Tech Summit Delhi Stage',
          originalFileName: 'delhi_tech_summit_stage.mp4',
          fileType: 'VIDEO',
          mimeType: 'video/mp4',
          fileSizeBytes: 34000000,
          s3Key: 'demo/delhi_tech_summit_stage.mp4',
          country: 'India',
          year: 2026,
          city: 'Delhi',
          event: 'Conference',
          customKeywords: ['stage', 'speaker', 'audience', 'technology'],
        },
      ];

      for (const item of demoItems) {
        const presigned = await api.post('/media/presigned-url', {
          fileName: item.originalFileName,
          fileType: item.fileType,
          mimeType: item.mimeType,
          fileSizeBytes: item.fileSizeBytes,
        });

        await api.post('/media/confirm-upload', {
          s3Key: presigned.data.s3Key,
          ...item,
        });
      }
    } catch (e) {
      console.warn('Demo seeding skipped or already exists');
    }
  };

  const handleDownload = async (asset: MediaAsset) => {
    try {
      const res = await api.get(`/media/${asset.id}/download`);
      window.open(res.data.downloadUrl, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate signed download link');
    }
  };

  const handleRescan = async (asset: MediaAsset) => {
    try {
      await api.post(`/media/${asset.id}/rescan`);
      alert('AI Re-scan job enqueued successfully.');
      fetchMedia();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to trigger AI re-scan');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-gray-100">
      {/* Top Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* System Architecture Metrics Banner */}
        <div className="w-full glass-panel rounded-2xl p-4 sm:p-6 border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-gray-900/60 shadow-glow flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center space-x-2">
                <span>AI Media Engine Active</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  pgvector HNSW Index
                </span>
              </h2>
              <p className="text-xs text-gray-300 mt-0.5 max-w-2xl">
                Optimized for 5–20 TB S3 media libraries. Rekognition & Bedrock AI analysis stored in PostgreSQL & Redis—eliminating repetitive S3 object scanning.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 shrink-0 text-xs font-semibold">
            <div className="text-center px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800">
              <p className="text-[10px] text-gray-400">Total Scale</p>
              <p className="text-indigo-400 font-extrabold">20 TB Target</p>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800">
              <p className="text-[10px] text-gray-400">Cache Layer</p>
              <p className="text-purple-400 font-extrabold">Redis + BullMQ</p>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Views */}
        {activeTab === 'users' || activeTab === 'audit' ? (
          <AdminDashboard activeTab={activeTab as 'users' | 'audit'} />
        ) : (
          <div className="space-y-6">
            {/* Search Input Bar */}
            <div className="relative w-full">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-indigo-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Try semantic AI queries, e.g. "Delhi 2026 festival photos with crowd" or "Taj Mahal Agra monument"'
                  className="w-full bg-gray-900/90 border border-gray-800 focus:border-indigo-500 rounded-2xl pl-12 pr-28 py-3.5 text-sm font-medium text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition shadow-lg"
                />
                <button
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                  className="lg:hidden absolute right-3 px-3 py-1.5 rounded-xl bg-gray-800 text-xs font-semibold text-gray-300 flex items-center space-x-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Preset Query Prompt Suggestions */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                <span className="text-gray-400 font-semibold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Try Prompts:</span>
                </span>
                {[
                  'Delhi 2026 festival photos with crowd',
                  'Agra Taj Mahal monument sunset',
                  'India 2026 event with stage and crowd',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setSearchQuery(prompt)}
                    className="px-3 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition text-[11px] font-medium"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Grid: Sidebar + Gallery */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Filter Sidebar */}
              <div className={`${showFiltersMobile ? 'block' : 'hidden'} lg:block`}>
                <FilterSidebar
                  filters={filters}
                  setFilters={setFilters}
                  onReset={() => {
                    setFilters({
                      country: '',
                      year: '',
                      city: '',
                      event: '',
                      festival: '',
                      mediaType: '',
                      keyword: '',
                    });
                    setSearchQuery('');
                  }}
                />
              </div>

              {/* Main Media Grid */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-300 flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>Media Library Assets ({assets.length})</span>
                  </h3>
                </div>

                <MediaGallery
                  assets={assets}
                  loading={loading}
                  onSelectAsset={(asset) => setSelectedAsset(asset)}
                  onDownloadAsset={handleDownload}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      <MediaLightbox
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onDownload={handleDownload}
        onRescan={handleRescan}
        userRole={user?.role}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchMedia}
      />
    </div>
  );
}
