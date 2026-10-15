'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Store,
  MapPin,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Zap,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setErrorMessage('An unexpected connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (staffEmail: string, staffPass: string) => {
    setEmail(staffEmail);
    setPassword(staffPass);
    setErrorMessage(null);
  };

  return (
    <div className="w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 mb-4 border border-amber-200/40">
            NA
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Nasir Amme Electronics
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-[#D9A441]" />
            <span>Dire Dawa, Kebele 02</span>
            <span>•</span>
            <span className="text-amber-400/90 font-medium">Near B-Capital Hotel</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Retail Point of Sale & Authoritative Inventory System
          </p>
        </div>

        {/* Login Card with Glassmorphic Touch */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-500" />

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Staff Portal Access</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sign in with your verified store credentials
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-[#D9A441] border border-amber-500/20">
              Till Auth
            </span>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email or Login ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@amme-electronics.et"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Testing Profiles */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Role Profiles</span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-medium">Click to fill email & password</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickSelect('nasir@amme-electronics.et', 'AmmeAdmin#2026!')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-left transition-all cursor-pointer group shadow-xs"
              >
                <div className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                  Nasir Amme
                </div>
                <div className="text-[10px] text-amber-400 font-medium">Administrator</div>
                <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50 truncate">
                  AmmeAdmin#2026!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('yonas@amme-electronics.et', 'YonasManager#2026!')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 text-left transition-all cursor-pointer group shadow-xs"
              >
                <div className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                  Yonas Bekele
                </div>
                <div className="text-[10px] text-blue-400 font-medium">Store Manager</div>
                <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50 truncate">
                  YonasManager#2026!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('tigist@amme-electronics.et', 'TigistCashier#2026!')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-all cursor-pointer group shadow-xs"
              >
                <div className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  Tigist Alem
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">Cashier Till 1</div>
                <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50 truncate">
                  TigistCashier#2026!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('abel@amme-electronics.et', 'AbelStock#2026!')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 text-left transition-all cursor-pointer group shadow-xs"
              >
                <div className="font-bold text-white group-hover:text-purple-400 transition-colors truncate">
                  Abel Girma
                </div>
                <div className="text-[10px] text-purple-400 font-medium">Stock Keeper</div>
                <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50 truncate">
                  AbelStock#2026!
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Audit Notice */}
        <div className="text-center mt-6 text-[11px] text-slate-500">
          <p>
            Authorized personnel only. Sessions expire after 8 hours. All access events are
            cryptographically recorded to immutable audit ledgers.
          </p>
        </div>
      </div>
    </div>
  );
}
