'use client';

import React from 'react';
import { Filter, RotateCcw, MapPin, Calendar, Tag, Video, Image as ImageIcon, Sparkles } from 'lucide-react';

export interface FilterState {
  country: string;
  year: string;
  city: string;
  event: string;
  festival: string;
  mediaType: string;
  keyword: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onReset: () => void;
}

export default function FilterSidebar({ filters, setFilters, onReset }: FilterSidebarProps) {
  const handleChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <aside className="w-full lg:w-72 glass-panel rounded-2xl p-5 border border-gray-800 space-y-6 shrink-0">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm tracking-wide">
          <Filter className="w-4 h-4" />
          <span>Structured Metadata Filters</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-indigo-300 flex items-center space-x-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Country Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span>Country</span>
        </label>
        <select
          value={filters.country}
          onChange={(e) => handleChange('country', e.target.value)}
          className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">All Countries</option>
          <option value="India">India</option>
        </select>
      </div>

      {/* Year Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>Year</span>
        </label>
        <select
          value={filters.year}
          onChange={(e) => handleChange('year', e.target.value)}
          className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">All Years</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </div>

      {/* City Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-purple-400" />
          <span>City</span>
        </label>
        <select
          value={filters.city}
          onChange={(e) => handleChange('city', e.target.value)}
          className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">All Cities</option>
          <option value="Delhi">Delhi</option>
          <option value="Agra">Agra</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Jaipur">Jaipur</option>
        </select>
      </div>

      {/* Event / Festival Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
          <Tag className="w-3.5 h-3.5 text-pink-400" />
          <span>Event / Festival</span>
        </label>
        <select
          value={filters.festival}
          onChange={(e) => handleChange('festival', e.target.value)}
          className="w-full bg-gray-900/80 border border-gray-800 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="">All Events & Festivals</option>
          <option value="Festival">Festival</option>
          <option value="Diwali">Diwali</option>
          <option value="Holi">Holi</option>
          <option value="Conference">Conference</option>
          <option value="Exhibition">Exhibition</option>
        </select>
      </div>

      {/* Media Type Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Media Asset Type</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-900/90 rounded-xl border border-gray-800 text-xs">
          <button
            onClick={() => handleChange('mediaType', '')}
            className={`py-1.5 rounded-lg font-medium transition ${
              !filters.mediaType ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleChange('mediaType', 'IMAGE')}
            className={`py-1.5 rounded-lg font-medium transition flex items-center justify-center space-x-1 ${
              filters.mediaType === 'IMAGE' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>Image</span>
          </button>
          <button
            onClick={() => handleChange('mediaType', 'VIDEO')}
            className={`py-1.5 rounded-lg font-medium transition flex items-center justify-center space-x-1 ${
              filters.mediaType === 'VIDEO' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>Video</span>
          </button>
        </div>
      </div>

      {/* Quick AI Keyword Tags */}
      <div className="space-y-2 pt-2 border-t border-gray-800">
        <label className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Popular AI Keywords</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {['Crowd', 'Stage', 'Diwali', 'Monument', 'Lights', 'Architecture', 'Taj Mahal'].map((kw) => (
            <button
              key={kw}
              onClick={() => handleChange('keyword', filters.keyword === kw ? '' : kw)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                filters.keyword === kw
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-glow'
                  : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-800'
              }`}
            >
              #{kw}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
