import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import NotificationsDropdown from '../NotificationsDropdown';
import { Menu, Bell, Search, ChevronLeft, ArrowLeft } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AppLayout({ children, title, subtitle, showBack = false }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on a detail/sub page
  const isSubPage = showBack || location.pathname.split('/').length > 2;

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      {/* Sidebar - Desktop Only */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content */}
      <div className="lg:ml-sidebar min-h-screen pb-20 lg:pb-0">
        {/* Mobile Header - App Style */}
        <header className="lg:hidden sticky top-0 z-30 bg-gradient-to-r from-brand-main to-blue-600 text-white">
          <div className="flex items-center justify-between px-4 h-14" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Left: Back or Menu */}
            <div className="flex items-center gap-2">
              {isSubPage ? (
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 -ml-2 rounded-xl active:bg-white/10 transition-colors"
                  data-testid="back-btn"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 rounded-xl active:bg-white/10 transition-colors"
                  data-testid="mobile-menu-btn"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              
              {title && (
                <h1 className="font-heading font-bold text-lg truncate max-w-[200px]">
                  {title}
                </h1>
              )}
            </div>

            {/* Right: Notifications + Avatar */}
            <div className="flex items-center gap-2">
              <button 
                className="relative p-2 rounded-xl active:bg-white/10 transition-colors"
                data-testid="notifications-btn"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full ring-2 ring-blue-600" />
              </button>
              
              <div className="w-9 h-9 rounded-full bg-white/20 overflow-hidden ring-2 ring-white/30">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Welcome Banner - Only on Dashboard */}
          {location.pathname === '/dashboard' && (
            <div className="px-4 pb-4">
              <p className="text-white/80 text-sm">Bem-vindo de volta,</p>
              <p className="font-heading font-bold text-xl">{user?.name?.split(' ')[0]}</p>
            </div>
          )}
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-8 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {title && (
                <div>
                  <h1 className="font-heading font-bold text-xl text-slate-900">{title}</h1>
                  {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="bg-transparent border-none outline-none text-sm w-40 placeholder:text-slate-400"
                />
              </div>

              <button className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Title - Only if not showing in header */}
            {title && !location.pathname.includes('/dashboard') && (
              <div className="lg:hidden mb-4">
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
              </div>
            )}
            
            {/* Desktop Title */}
            {title && (
              <div className="hidden lg:block mb-6">
                {subtitle && <p className="text-sm text-slate-500 -mt-4 mb-4">{subtitle}</p>}
              </div>
            )}
            
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
}

// Stat Card Component - Mobile Optimized
export function StatCard({ icon: Icon, label, value, trend, trendUp, color = 'blue', className, compact }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  if (compact) {
    return (
      <div className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:scale-[0.98] transition-transform",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
            <p className="text-lg font-heading font-bold text-slate-900 truncate">{value}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:p-6 hover:shadow-md hover:border-blue-100 transition-all duration-200 active:scale-[0.98]",
      className
    )}>
      <div className={cn("w-11 h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center mb-3 lg:mb-4", colors[color])}>
        <Icon className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={1.5} />
      </div>
      <p className="text-xs lg:text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-xl lg:text-2xl font-heading font-bold text-slate-900 mt-1">{value}</p>
      {trend && (
        <p className={cn(
          "text-xs font-medium mt-2 flex items-center gap-1",
          trendUp ? "text-emerald-600" : "text-red-500"
        )}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </p>
      )}
    </div>
  );
}

// Dashboard Card Component - Mobile Optimized
export function DashCard({ title, subtitle, action, children, className, noPadding, icon: Icon }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", className)}>
      {(title || action) && (
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-brand-main/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand-main" />
              </div>
            )}
            <div>
              <h3 className="font-heading font-semibold text-slate-900 text-sm lg:text-base">{title}</h3>
              {subtitle && <p className="text-xs lg:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4 lg:p-6'}>
        {children}
      </div>
    </div>
  );
}

// Progress Card Component
export function ProgressCard({ title, current, target, color = 'blue' }) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", colors[color])}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-bold text-brand-main">{Math.round(percentage)}%</span>
    </div>
  );
}

// Quick Action Button - Mobile Style
export function QuickAction({ icon: Icon, label, onClick, color = 'blue', badge }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 active:bg-blue-100',
    green: 'bg-emerald-50 text-emerald-600 active:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-600 active:bg-amber-100',
    purple: 'bg-purple-50 text-purple-600 active:bg-purple-100',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95",
        colors[color]
      )}
    >
      <div className="relative">
        <Icon className="w-6 h-6" strokeWidth={1.5} />
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Balance Card - Mobile Style (inspired by banking apps)
export function BalanceCard({ available, blocked, onWithdraw }) {
  return (
    <div className="bg-gradient-to-br from-brand-main to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/25">
      <p className="text-white/80 text-sm">Saldo Disponível</p>
      <p className="text-3xl font-heading font-bold mt-1">{formatCurrency(available)}</p>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
        <div>
          <p className="text-white/60 text-xs">Bloqueado</p>
          <p className="text-lg font-semibold">{formatCurrency(blocked)}</p>
        </div>
        {onWithdraw && (
          <button
            onClick={onWithdraw}
            className="px-4 py-2 bg-white text-brand-main rounded-xl font-semibold text-sm active:scale-95 transition-transform"
          >
            Sacar
          </button>
        )}
      </div>
    </div>
  );
}
