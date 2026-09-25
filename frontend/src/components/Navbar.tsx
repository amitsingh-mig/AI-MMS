'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Sparkles, Image, Shield, UserCheck, User as UserIcon, LogOut, ChevronDown } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  activeTab: 'gallery' | 'albums' | 'users' | 'audit';
  setActiveTab: (tab: 'gallery' | 'albums' | 'users' | 'audit') => void;
  onOpenLoginModal?: () => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  const roleBadgeStyle: Record<string, string> = {
    ADMIN: 'bg-rose-100 text-rose-900 border-rose-200',
    MANAGER: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    USER: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('gallery')}>
          <div className="w-9 h-9 rounded-xl bg-[#FFD600] flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xl font-black tracking-tight text-slate-900">PIX AI MMS</span>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${roleBadgeStyle[user?.role || 'USER']}`}>
              {user?.role || 'USER'}
            </span>
          </div>
        </div>



        {/* Far Right User Profile Header & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 transition border border-gray-200 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#FFD600] font-black text-sm flex items-center justify-center shadow-sm shrink-0 border border-slate-700">
              [ {userInitial} ]
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <p className="text-xs font-black text-slate-900">{user?.name || 'Authenticated User'}</p>
              <p className="text-[11px] text-slate-500 font-medium">{user?.email || 'user@domain.com'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Profile & Logout Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-gray-200 shadow-xl py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 pb-3 border-b border-gray-100 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#FFD600] font-black text-base flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{user?.email}</p>
                  <span className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${roleBadgeStyle[user?.role || 'USER']}`}>
                    {user?.role} ACCOUNT
                  </span>
                </div>
              </div>

              <div className="pt-2 px-2">
                <button
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
