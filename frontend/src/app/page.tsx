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
import { 
  Search, Sparkles, Image as ImageIcon, Zap, FolderKanban, Upload, 
  LayoutDashboard, Users, UserCheck, ShieldCheck, FileText, Cpu, 
  HardDrive, Settings, Grid, List, ArrowUpDown, Inbox 
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'gallery' | 'albums' | 'users' | 'audit'>('gallery');
  const [activeNav, setActiveNav] = useState<'gallery' | 'albums' | 'upload' | 'search' | 'dashboard' | 'users' | 'managers' | 'permissions' | 'audit' | 'ai' | 'storage' | 'settings'>('gallery');
  
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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
      setAssets(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch media assets:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

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

            <button
              onClick={() => setIsUploadOpen(true)}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>

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

          {/* MANAGEMENT Section */}
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
          {/* Top AI Engine Architecture Banner */}
          <div className="w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FFD600] text-slate-950 flex items-center justify-center shadow-sm shrink-0">
                <Zap className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>AI Media Engine Active</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    pgvector HNSW Index
                  </span>
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Optimized for 5–20 TB S3 media libraries. Rekognition & Bedrock AI analysis stored in PostgreSQL & Redis—eliminating repetitive S3 object scanning.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-gray-200 min-w-[110px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Scale</p>
                <p className="text-sm font-extrabold text-slate-900">20 TB Target</p>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-gray-200 min-w-[120px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Cache Layer</p>
                <p className="text-sm font-extrabold text-amber-700">Redis + BullMQ</p>
              </div>
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
                    placeholder="Search by keywords, location, event, festival, or semantic AI prompt..."
                    className="w-full bg-transparent pl-3 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={fetchMedia}
                    className="px-6 py-2.5 rounded-xl bg-[#FFD600] hover:bg-yellow-400 text-slate-950 font-extrabold text-sm transition shadow-sm shrink-0"
                  >
                    Search
                  </button>
                </div>

                {/* Prompt Suggestions */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 font-extrabold flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Try Prompts:</span>
                  </span>
                  {[
                    'Delhi festival photos with crowd',
                    'Agra Taj Mahal monument sunset',
                    'India event with stage and crowd',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setSearchQuery(prompt); }}
                      className="px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 transition text-[11px] font-bold"
                    >
                      "{prompt}"
                    </button>
                  ))}
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
                  }}
                />

                {/* Main Media Assets Section */}
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      <span>Media Library Assets ({assets.length})</span>
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

                      <button className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-gray-200 transition">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Sort</span>
                      </button>
                    </div>
                  </div>

                  {assets.length === 0 && !loading ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm space-y-4">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                        <Inbox className="w-7 h-7 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">No media available</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                          No media assets found matching your criteria. Upload new images or videos to build your AI library.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsUploadOpen(true)}
                        className="px-5 py-2.5 bg-[#FFD600] hover:bg-yellow-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition"
                      >
                        Upload First Asset
                      </button>
                    </div>
                  ) : (
                    <MediaGallery
                      assets={assets}
                      loading={loading}
                      onSelectAsset={(asset) => setSelectedAsset(asset)}
                      onDownloadAsset={handleDownload}
                    />
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
