import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'neutral',
  size = 'md',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none';

  const variantStyles = {
    success:
      'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/60',
    warning:
      'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/60',
    danger:
      'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/90 dark:border-rose-800/60',
    neutral:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    accent:
      'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/60',
    info:
      'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/60',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
