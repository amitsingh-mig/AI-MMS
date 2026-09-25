'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckSquare, Square, ShieldCheck, Key } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Unable to connect to authentication server. Ensure backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError('Please enter your account email address first.');
      return;
    }
    setForgotSent(true);
    setTimeout(() => setForgotSent(false), 5000);
  };

  return (
    <div className="min-h-screen w-full bg-[#0F172A] text-slate-100 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 backdrop-blur-xl relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFD600] text-slate-950 shadow-lg shadow-yellow-500/20 mb-1">
            <Sparkles className="w-8 h-8 fill-slate-950" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">PIX AI MMS</h1>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Centralized AI-Powered Digital Asset Management Platform
          </p>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start space-x-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200 leading-relaxed font-semibold">
              {error}
            </div>
          </div>
        )}

        {/* Forgot Password Reset Alert */}
        {forgotSent && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center space-x-3 text-xs text-emerald-300 font-bold animate-in fade-in">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Password reset instructions dispatched to {email}.</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Address Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD600] focus:ring-1 focus:ring-[#FFD600] transition"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-11 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD600] focus:ring-1 focus:ring-[#FFD600] transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-white transition focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition focus:outline-none"
            >
              {rememberMe ? (
                <CheckSquare className="w-4 h-4 text-[#FFD600]" />
              ) : (
                <Square className="w-4 h-4 text-slate-600" />
              )}
              <span className="font-semibold">Remember Me</span>
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-amber-400 hover:text-yellow-300 font-bold transition focus:outline-none"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#FFD600] hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-yellow-500/10 shrink-0"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Notice */}
        <div className="pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center space-x-1.5">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted Session & JWT Authorization</span>
          </p>
        </div>
      </div>
    </div>
  );
}
