import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({
  className,
  label,
  error,
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full h-11 px-4 bg-white border border-slate-200 rounded-lg text-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main',
          'transition-all duration-200',
          'placeholder:text-slate-400',
          error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = React.forwardRef(({
  className,
  label,
  error,
  children,
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full h-11 px-4 bg-white border border-slate-200 rounded-lg text-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main',
          'transition-all duration-200',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export const Textarea = React.forwardRef(({
  className,
  label,
  error,
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main',
          'transition-all duration-200 resize-none',
          'placeholder:text-slate-400',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
