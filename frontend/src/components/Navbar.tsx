'use client';

import React from 'react';
import { useAuth } from '../lib/auth-context';
import { Sparkles, Upload, Shield, Users, LogOut, Image, Filter, FileText } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  activeTab: 'gallery' | 'albums' | 'users' | 'audit';
  setActiveTab: (tab: 'gallery' | 'albums' | 'users' | 'audit') => void;
}

export default function Navbar({ onOpenUpload, activeTab, setActiveTab }: NavbarProps) {
  const { user, logout, switchRoleQuickly } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-gray-800/60 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('gallery')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight gradient-text">PIX AI MMS</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              5–20 TB Enterprise
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'gallery' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Media Library</span>
          </button>
          
          {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <button
              onClick={() => setActiveTab('albums')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'albums' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Albums</span>
            </button>
          )}

          {user && user.role === 'ADMIN' && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Users & Roles</span>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Audit Logs</span>
              </button>
            </>
          )}
        </nav>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center space-x-3">
          {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-glow transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Media</span>
            </button>
          )}

          {/* Quick Role Switcher for Testing */}
          <div className="hidden lg:flex items-center space-x-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800 text-xs">
            <span className="text-gray-400 px-2 font-medium">Role:</span>
            <button
              onClick={() => switchRoleQuickly('ADMIN')}
              className={`px-2 py-1 rounded-md font-semibold transition ${
                user?.role === 'ADMIN' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchRoleQuickly('MANAGER')}
              className={`px-2 py-1 rounded-md font-semibold transition ${
                user?.role === 'MANAGER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => switchRoleQuickly('USER')}
              className={`px-2 py-1 rounded-md font-semibold transition ${
                user?.role === 'USER' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              User
            </button>
          </div>

          {/* User Profile Badge */}
          {user ? (
            <div className="flex items-center space-x-3 border-l border-gray-800 pl-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-gray-200">{user.name}</p>
                <p className="text-[10px] font-medium text-gray-400">{user.email}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
