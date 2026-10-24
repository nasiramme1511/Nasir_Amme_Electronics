'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const getStyles = () => {
          switch (toast.type) {
            case 'success':
              return {
                bg: 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 shadow-emerald-500/10',
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
                bar: 'bg-emerald-600 dark:bg-emerald-500',
              };
            case 'error':
              return {
                bg: 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800 shadow-rose-500/10',
                icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
                bar: 'bg-rose-600 dark:bg-rose-500',
              };
            case 'warning':
              return {
                bg: 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 shadow-amber-500/10',
                icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
                bar: 'bg-amber-500',
              };
            case 'info':
            default:
              return {
                bg: 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-blue-500/10',
                icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />,
                bar: 'bg-blue-600 dark:bg-blue-500',
              };
          }
        };

        const { bg, icon, bar } = getStyles();

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-xl border ${bg} p-4 shadow-lg flex items-start gap-3 transition-all transform animate-in slide-in-from-bottom-5 duration-200`}
          >
            {/* Left accent strip */}
            <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${bar}`} />

            <div className="pl-1">{icon}</div>

            <div className="flex-1 pr-2">
              <h5 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                {toast.title}
              </h5>
              {toast.message && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-normal">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
