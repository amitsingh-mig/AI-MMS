'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import api, { MediaAsset } from '../lib/api';
import Navbar from '../components/Navbar';
import FilterSidebar, { FilterState } from '../components/FilterSidebar';
import MediaGallery from '../components/MediaGallery';
import MediaLightbox from '../components/MediaLightbox';
import UploadModal from '../components/UploadModal';
import LoginPage from '../components/LoginPage';
import AdminDashboard from '../components/AdminDashboard';
import { 
  Search, Sparkles, Image as ImageIcon, Zap, FolderKanban, Upload, 
  LayoutDashboard, Users, UserCheck, ShieldCheck, FileText, Cpu, 
  HardDrive, Settings, Grid, List, ArrowUpDown, Inbox, ChevronLeft, ChevronRight, RefreshCw, KeyRound
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'gallery' | 'albums' | 'users' | 'audit'>('gallery');
  const [activeNav, setActiveNav] = useState<'gallery' | 'albums' | 'upload' | 'search' | 'dashboard' | 'users' | 'managers' | 'permissions' | 'audit' | 'ai' | 'storage' | 'settings'>('gallery');
  
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 24;


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
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [syncingS3, setSyncingS3] = useState(false);

  const canUpload = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canManageUsers = user?.role === 'ADMIN';

  const fetchMedia = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (searchQuery) params.q = searchQuery;
      if (filters.country) params.country = filters.country;
      if (filters.year) params.year = filters.year;
      if (filters.city) params.city = filters.city;
      if (filters.event) params.event = filters.event;
      if (filters.festival) params.festival = filters.festival;
      if (filters.mediaType) params.mediaType = filters.mediaType;
      if (filters.keyword) params.keyword = filters.keyword;

      const res = await api.get('/search', { params });
      setAssets(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || 0);
      setBackendStatus('online');
    } catch (err: any) {
      setAssets([]);
      setTotalPages(1);
      setTotalItems(0);
      if (err.response) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, filters, page, limit]);

  useEffect(() => {
    if (user) {
      fetchMedia();
    }
  }, [user, fetchMedia]);

  // Render Login Page when unauthenticated (All hooks declared above)
  if (!user) {
    return <LoginPage />;
  }

  const handleSyncS3 = async () => {
    setSyncingS3(true);
    try {
      const res = await api.get('/media/sync-s3');
      alert(`S3 Sync Complete! Synced ${res.data.syncedCount || 0} real objects from bucket.`);
      fetchMedia();
    } catch (err: any) {
      alert('S3 sync failed or backend is offline.');
    } finally {
      setSyncingS3(false);
    }
  };

  const handleDownload = async (asset: MediaAsset) => {
    try {
      const encodedId = encodeURIComponent(asset.id);
      const res = await api.get(`/media/${encodedId}/download`);
      if (res.data.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      } else {
        alert('Download URL not generated.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate signed download link');
    }
  };

  const handleRescan = async (asset: MediaAsset) => {
    try {
      const encodedId = encodeURIComponent(asset.id);
      await api.post(`/media/${encodedId}/rescan`);
      alert('AI Re-scan job enqueued successfully.');
      fetchMedia();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to trigger AI re-scan');
    }
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (!confirm(`Are you sure you want to delete "${asset.title}" from S3 and database?`)) return;
    try {
      const encodedId = encodeURIComponent(asset.id);
      await api.delete(`/media/${encodedId}`);
      alert('Media asset deleted from S3 and database.');
      setSelectedAsset(null);
      fetchMedia();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete asset.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Top Header Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container Layout */}
      <div className="flex flex-1 w-full max-w-[1600px] mx-auto">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 py-6 px-4 space-y-6 hidden md:block shrink-0 shadow-sm">
          {/* Main Menu Links */}
          <div className="space-y-1">
            <button
              onClick={() => { setActiveNav('gallery'); setActiveTab('gallery'); }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                activeNav === 'gallery'
                  ? 'bg-[#FFD600] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Media Library</span>
            </button>

            <button
              onClick={() => { setActiveNav('albums'); setActiveTab('albums'); }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                activeNav === 'albums'
                  ? 'bg-[#FFD600] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Albums</span>
            </button>

            {canUpload && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <Upload className="w-4 h-4" />
                <span>Upload to S3</span>
              </button>
            )}

            {canUpload && (
              <button
                onClick={handleSyncS3}
                disabled={syncingS3}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
              >
                <RefreshCw className={`w-4 h-4 ${syncingS3 ? 'animate-spin' : ''}`} />
                <span>Sync S3 Bucket</span>
              </button>
            )}

            <button
              onClick={() => setActiveNav('search')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                activeNav === 'search'
                  ? 'bg-[#FFD600] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>AI Search</span>
            </button>

            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                activeNav === 'dashboard'
                  ? 'bg-[#FFD600] text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>

          {/* MANAGEMENT Section - Admin Only */}
          {canManageUsers && (
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <p className="px-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Management
              </p>
              <button
                onClick={() => { setActiveNav('users'); setActiveTab('users'); }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl font-semibold text-xs transition ${
                  activeNav === 'users' ? 'bg-[#FFD600] text-slate-950' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </button>

              <button
                onClick={() => { setActiveNav('managers'); setActiveTab('users'); }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl font-semibold text-xs transition ${
                  activeNav === 'managers' ? 'bg-[#FFD600] text-slate-950' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Managers</span>
              </button>

              <button
                onClick={() => setActiveNav('permissions')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl font-semibold text-xs transition ${
                  activeNav === 'permissions' ? 'bg-[#FFD600] text-slate-950' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Permissions</span>
              </button>

              <button
                onClick={() => { setActiveNav('audit'); setActiveTab('audit'); }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl font-semibold text-xs transition ${
                  activeNav === 'audit' ? 'bg-[#FFD600] text-slate-950' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Activity Logs</span>
              </button>
            </div>
          )}

          {/* SYSTEM Section */}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <p className="px-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              System
            </p>
            <button
              onClick={() => setActiveNav('ai')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl font-semibold text-xs transition ${
                activeNav === 'ai' ? 'bg-[#FFD600] text-slate-950' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>AI Processing</span>
            </button>

            <button
              onClick={() => setActiveNav('storage')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl font-semibold text-xs transition ${
                activeNav === 'storage' ? 'bg-[#FFD600] text-slate-950' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Storage & Stats</span>
            </button>

            <button
              onClick={() => setActiveNav('settings')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl font-semibold text-xs transition ${
                activeNav === 'settings' ? 'bg-[#FFD600] text-slate-950' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* Right Dashboard Content Workspace */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Backend Offline Warning */}
          {backendStatus === 'offline' && (
            <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3.5 flex items-center space-x-3 shadow-sm">
              <span className="text-amber-500 text-lg">⚠️</span>
              <div>
                <p className="text-xs font-extrabold text-amber-900">Backend API Offline</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  The NestJS backend API is offline. Ensure <code className="font-mono bg-amber-100 px-1 rounded">backend/</code> is running on port 4000 to fetch S3 assets.
                </p>
              </div>
            </div>
          )}

          {/* Top AI Engine Architecture Banner */}
          <div className="w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FFD600] text-slate-950 flex items-center justify-center shadow-sm shrink-0">
                <Zap className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>Real AWS S3 Bucket Storage</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                    Bucket: ai-pics-mig
                  </span>
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Real S3 objects delivered via NestJS pre-signed URLs from <code className="font-mono bg-slate-100 px-1 rounded">low/</code>, <code className="font-mono bg-slate-100 px-1 rounded">previews/</code>, <code className="font-mono bg-slate-100 px-1 rounded">original/</code>, <code className="font-mono bg-slate-100 px-1 rounded">media/</code>, and <code className="font-mono bg-slate-100 px-1 rounded">uploads/</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={handleSyncS3}
                disabled={syncingS3}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-2 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingS3 ? 'animate-spin' : ''}`} />
                <span>Sync S3 Bucket</span>
              </button>
            </div>
          </div>

          {/* Dynamic Views */}
          {activeTab === 'users' || activeTab === 'audit' ? (
            <AdminDashboard activeTab={activeTab as 'users' | 'audit'} />
          ) : (
            <div className="space-y-5">
              {/* Search Bar with Yellow Search Button */}
              <div className="space-y-3">
                <div className="relative flex items-center bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm">
                  <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search S3 media by filename, keywords, or AI vector prompt..."
                    className="w-full bg-transparent pl-3 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={() => { setPage(1); fetchMedia(); }}
                    className="px-6 py-2.5 rounded-xl bg-[#FFD600] hover:bg-yellow-400 text-slate-950 font-extrabold text-sm transition shadow-sm shrink-0"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Layout Grid: Left Filter Sidebar + Right Media Library Grid */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Filter Sidebar */}
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
                    setPage(1);
                  }}
                />

                {/* Main Media Assets Section */}
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      <span>Media Library Assets ({totalItems})</span>
                    </h3>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                            viewMode === 'grid' ? 'bg-[#FFD600] text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>Grid</span>
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                            viewMode === 'list' ? 'bg-[#FFD600] text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>List</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Media Gallery */}
                  <MediaGallery
                    assets={assets}
                    loading={loading}
                    onSelectAsset={(asset) => setSelectedAsset(asset)}
                    onDownloadAsset={handleDownload}
                  />

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm text-xs font-bold">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <span className="text-slate-600 font-semibold">
                        Page <span className="text-slate-950 font-black">{page}</span> of {totalPages} ({totalItems} total items)
                      </span>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Lightbox Modal */}
      <MediaLightbox
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onDownload={handleDownload}
        onRescan={handleRescan}
        onDelete={canUpload ? handleDelete : undefined}
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
