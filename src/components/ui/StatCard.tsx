import React from 'react';
import { Card } from './Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  indicatorColor?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  indicatorColor = 'primary',
}) => {
  const colorMap = {
    primary:
      'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    accent:
      'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    success:
      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    warning:
      'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger:
      'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60',
  };

  return (
    <Card className="hover:shadow-md dark:hover:border-slate-700 transition-all duration-200 relative group">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {title}
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
              {value}
            </div>
          </div>

          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${colorMap[indicatorColor]}`}
          >
            {icon}
          </div>
        </div>

        {(subtitle || trend) && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            {trend && (
              <span
                className={`inline-flex items-center font-bold gap-0.5 ${
                  trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{trend.value}</span>
                {trend.label && (
                  <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                    {trend.label}
                  </span>
                )}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
