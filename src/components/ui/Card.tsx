import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3
      className={`text-base font-bold text-slate-900 dark:text-white tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <p className={`text-xs text-slate-500 dark:text-slate-400 mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
