'use client';

import React from 'react';
import { useAuth } from '../lib/auth-context';
import { Sparkles, Image, Filter, Users, FileText } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  activeTab: 'gallery' | 'albums' | 'users' | 'audit';
  setActiveTab: (tab: 'gallery' | 'albums' | 'users' | 'audit') => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { user } = useAuth();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 px-6 py-3.5 shadow-sm">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('gallery')}>
          <div className="w-9 h-9 rounded-xl bg-[#FFD600] flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-gray-950 fill-gray-950" />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xl font-black tracking-tight text-slate-900">PIX AI MMS</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              5–20 TB Enterprise
            </span>
          </div>
        </div>

        {/* Middle Tab Button */}
        <div className="hidden md:flex items-center">
          <button
            onClick={() => setActiveTab('gallery')}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-[#FFD600] text-slate-950 font-bold text-sm shadow-sm transition hover:bg-yellow-400"
          >
            <Image className="w-4 h-4" />
            <span>Media Library</span>
          </button>
        </div>

        {/* Far Right User Avatar ONLY (No Role Switcher, No Bell) */}
        <div className="flex items-center">
          <div 
            title={user ? `${user.name} (${user.role})` : 'User Profile'}
            className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-800 transition border border-slate-700"
          >
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
}
