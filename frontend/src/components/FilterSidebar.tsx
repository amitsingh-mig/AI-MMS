'use client';

import React from 'react';
import { Filter, RotateCcw, MapPin, Calendar, Tag, Image as ImageIcon, ChevronDown } from 'lucide-react';

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
    <aside className="w-full lg:w-72 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-5 shrink-0">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm tracking-tight">
          <div className="w-6 h-6 rounded-lg bg-[#FFD600] flex items-center justify-center shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-950" />
          </div>
          <span>Structured Metadata Filters</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Country Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-amber-500" />
          <span>Country</span>
        </label>
        <div className="relative">
          <select
            value={filters.country}
            onChange={(e) => handleChange('country', e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 appearance-none cursor-pointer"
          >
            <option value="">All Countries</option>
            <option value="India">India</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Year Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>Year</span>
        </label>
        <div className="relative">
          <select
            value={filters.year}
            onChange={(e) => handleChange('year', e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 appearance-none cursor-pointer"
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* City Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-amber-500" />
          <span>City</span>
        </label>
        <div className="relative">
          <select
            value={filters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 appearance-none cursor-pointer"
          >
            <option value="">All Cities</option>
            <option value="Delhi">Delhi</option>
            <option value="Agra">Agra</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Jaipur">Jaipur</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Event / Festival Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-500" />
          <span>Event / Festival</span>
        </label>
        <div className="relative">
          <select
            value={filters.festival}
            onChange={(e) => handleChange('festival', e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 appearance-none cursor-pointer"
          >
            <option value="">All Events & Festivals</option>
            <option value="Festival">Festival</option>
            <option value="Diwali">Diwali</option>
            <option value="Holi">Holi</option>
            <option value="Conference">Conference</option>
            <option value="Exhibition">Exhibition</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Media Asset Type Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
          <span>Media Asset Type</span>
        </label>
        <div className="relative">
          <select
            value={filters.mediaType}
            onChange={(e) => handleChange('mediaType', e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>
    </aside>
  );
}
