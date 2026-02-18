import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
  className,
  variant = 'primary',
  size = 'default',
  loading = false,
  children,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-primary-main text-white hover:bg-primary-light shadow-lg hover:shadow-primary-main/25',
    secondary: 'bg-white text-primary-main border border-slate-200 hover:bg-slate-50',
    ghost: 'hover:bg-slate-100 text-slate-700 hover:text-slate-900',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    gold: 'gold-gradient text-white hover:opacity-90',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 spinner" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
