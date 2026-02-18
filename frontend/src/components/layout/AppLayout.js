import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import { Menu, Bell, Search, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AppLayout({ children, title, subtitle }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content */}
      <div className="lg:ml-sidebar min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            {/* Left: Mobile Menu + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {title && (
                <div className="hidden sm:block">
                  <h1 className="font-heading font-bold text-xl text-slate-900">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-slate-500">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right: Search + Notifications + User */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="bg-transparent border-none outline-none text-sm w-40 placeholder:text-slate-400"
                />
              </div>

              {/* Notifications */}
              <button 
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                data-testid="notifications-btn"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Dropdown (Mobile) */}
              <div className="lg:hidden flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-brand-main overflow-hidden">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Title */}
            {title && (
              <div className="sm:hidden mb-6">
                <h1 className="font-heading font-bold text-2xl text-slate-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
                )}
              </div>
            )}
            
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Stat Card Component
export function StatCard({ icon: Icon, label, value, trend, trendUp, color = 'blue', className }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-blue-100 transition-all duration-200",
      className
    )}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", colors[color])}>
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-heading font-bold text-slate-900 mt-1">{value}</p>
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

// Dashboard Card Component
export function DashCard({ title, subtitle, action, children, className, noPadding }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm", className)}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
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
