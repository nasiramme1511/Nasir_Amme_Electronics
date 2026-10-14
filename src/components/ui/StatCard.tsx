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
  isDemo?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  indicatorColor = 'primary',
  isDemo = true,
}) => {
  const colorMap = {
    primary: 'bg-[#101827]/5 text-[#101827] border-[#101827]/10',
    accent: 'bg-[#D9A441]/10 text-[#93660a] border-[#D9A441]/30',
    success: 'bg-[#16845B]/10 text-[#16845B] border-[#16845B]/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <Card className="hover:shadow-md transition-shadow relative">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {title}
              </span>
              {isDemo && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                  Demo
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-[#101827] mt-1.5 tracking-tight">
              {value}
            </div>
          </div>

          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${colorMap[indicatorColor]}`}
          >
            {icon}
          </div>
        </div>

        {(subtitle || trend) && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {trend && (
              <span
                className={`inline-flex items-center font-medium gap-0.5 ${
                  trend.isPositive ? 'text-[#16845B]' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{trend.value}</span>
                {trend.label && (
                  <span className="text-slate-400 font-normal ml-1">
                    {trend.label}
                  </span>
                )}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-500 text-[11px] truncate">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
