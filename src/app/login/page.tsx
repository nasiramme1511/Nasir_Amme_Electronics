'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getDashboardRouteForRole, RoleType } from '@/lib/permissions';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error || data.message || 'Invalid credentials or unauthorized terminal access.'
        );
      }

      // Synchronize in-memory auth state so client-side route guards acknowledge authenticated user
      await refreshUser();

      // Dynamic routing to canonical dashboard based on authenticated employee role
      const primaryRole = (data.user?.role || data.data?.user?.role || 'cashier').toLowerCase() as RoleType;
      const targetDashboard = getDashboardRouteForRole(primaryRole);
      
      // Navigate cleanly
      window.location.href = targetDashboard;
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B111E] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white transition-colors duration-150">
      
      {/* Top Header Navigation */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
        {/* Left Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-2xs overflow-hidden">
            <Image
              src="/logo.png"
              alt="Nasir Amme Electronics"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              NASIR AMME ELECTRONICS
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Retail POS & Inventory System &bull; Dire Dawa, Ethiopia
            </p>
          </div>
        </div>

        {/* Right Action Controls: Theme Switcher + Status Pill */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* System Online Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Content: Centered Enterprise Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs">
          
          {/* Card Header with Centered Logo */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center p-1.5 shadow-2xs">
              <Image
                src="/logo.png"
                alt="Nasir Amme Electronics"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Staff Portal Login
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter credentials to access your station
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field 1: Identifier */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Staff Email, Phone or User ID
              </label>
              <div className="relative rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. nasir@amme-electronics.et or 'admin'"
                  className="w-full pl-9 pr-3 py-2.5 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-sans"
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password or Security PIN
              </label>
              <div className="relative rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password or station PIN"
                  className="w-full pl-9 pr-10 py-2.5 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium transition-colors hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button: Clean Enterprise Blue */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full px-6 py-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="font-medium">
          &copy; 2026 Nasir Amme Electronics &bull; Enterprise POS & Retail System
        </div>
        <div className="font-mono text-[11px]">
          Branch: DD-MAIN-01 &bull; Africa/Addis_Ababa (EAT UTC+3)
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-xl">
            <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Staff Password Assistance
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              To protect branch hardware and fiscal integrity, security PINs and passwords are reset directly by your Branch Administrator or Store Manager in Dire Dawa.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
