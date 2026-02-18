import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, highlight = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl p-6 transition-shadow duration-200',
        highlight 
          ? 'bg-primary-main text-white shadow-xl relative overflow-hidden'
          : 'bg-white border border-slate-100 shadow-sm hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('font-heading font-bold text-lg', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children }) {
  return (
    <p className={cn('text-sm text-slate-500 mt-1', className)}>
      {children}
    </p>
  );
}

export function CardContent({ className, children }) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-slate-100', className)}>
      {children}
    </div>
  );
}
