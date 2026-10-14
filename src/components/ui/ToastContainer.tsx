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
                bg: 'bg-white border-emerald-300 shadow-emerald-500/10',
                icon: <CheckCircle2 className="w-5 h-5 text-[#16845B] shrink-0" />,
                bar: 'bg-[#16845B]',
              };
            case 'error':
              return {
                bg: 'bg-white border-rose-300 shadow-rose-500/10',
                icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
                bar: 'bg-rose-600',
              };
            case 'warning':
              return {
                bg: 'bg-white border-amber-300 shadow-amber-500/10',
                icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
                bar: 'bg-[#D9A441]',
              };
            case 'info':
            default:
              return {
                bg: 'bg-white border-blue-300 shadow-blue-500/10',
                icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
                bar: 'bg-blue-600',
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
              <h5 className="text-sm font-semibold text-slate-900 leading-tight">
                {toast.title}
              </h5>
              {toast.message && (
                <p className="text-xs text-slate-600 mt-1 leading-normal">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
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
