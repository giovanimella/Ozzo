import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ACCESS_LEVELS } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Users, ShoppingBag, Wallet, Settings, 
  Network, LogOut, Menu, X, Package, FileText, UserCircle, 
  BarChart3, ClipboardList, Trophy, Target, Link2, Store,
  ChevronRight, Bell, TrendingUp, DollarSign, ChevronDown
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

const getMenuItems = (accessLevel) => {
  const items = [];

  // Admin Técnico (0) e Admin Geral (1)
  if (accessLevel <= 1) {
    items.push({ section: 'Principal' });
    items.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' });
    items.push({ icon: Users, label: 'Usuários', path: '/users' });
    items.push({ icon: ClipboardList, label: 'Pedidos', path: '/orders' });
    items.push({ section: 'Análises' });
    items.push({ icon: BarChart3, label: 'Relatórios', path: '/reports' });
    items.push({ icon: Trophy, label: 'Ranking', path: '/ranking' });
    items.push({ icon: Target, label: 'Metas', path: '/goals' });
    items.push({ section: 'Financeiro' });
    items.push({ icon: Wallet, label: 'Saques', path: '/withdrawals' });
    items.push({ icon: FileText, label: 'Logs', path: '/logs' });
    items.push({ section: 'Loja' });
    items.push({ icon: Package, label: 'Produtos', path: '/products' });
  }

  // Admin Técnico (0) only
  if (accessLevel === 0) {
    items.push({ section: 'Sistema' });
    items.push({ icon: Settings, label: 'Configurações', path: '/settings' });
  }

  // Supervisor (2)
  if (accessLevel === 2) {
    items.push({ section: 'Principal' });
    items.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' });
    items.push({ icon: Users, label: 'Minha Carteira', path: '/my-portfolio' });
    items.push({ icon: Trophy, label: 'Ranking', path: '/ranking' });
  }

  // Líder (3) e Revendedor (4)
  if (accessLevel === 3 || accessLevel === 4) {
    items.push({ section: 'Principal' });
    items.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' });
    items.push({ icon: Network, label: 'Minha Rede', path: '/network' });
    items.push({ section: 'Performance' });
    items.push({ icon: Trophy, label: 'Ranking', path: '/ranking' });
    items.push({ icon: Target, label: 'Metas', path: '/goals' });
    items.push({ icon: Link2, label: 'Link de Indicação', path: '/referral-links' });
    items.push({ section: 'Financeiro' });
    items.push({ icon: ShoppingBag, label: 'Meus Pedidos', path: '/my-orders' });
    items.push({ icon: Wallet, label: 'Minha Carteira', path: '/wallet' });
  }

  // Cliente (5) e Embaixador (6)
  if (accessLevel === 5 || accessLevel === 6) {
    items.push({ section: 'Principal' });
    items.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' });
    items.push({ icon: ShoppingBag, label: 'Meus Pedidos', path: '/my-orders' });
    items.push({ section: 'Indicação' });
    items.push({ icon: Link2, label: 'Meu Link', path: '/referral-links' });
    items.push({ icon: Target, label: 'Metas', path: '/goals' });
    items.push({ icon: Wallet, label: 'Minhas Comissões', path: '/wallet' });
  }

  return items;
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, accessLevel, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const menuItems = getMenuItems(accessLevel);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userStats = [
    { icon: TrendingUp, value: user?.points || 0, label: 'Pontos' },
    { icon: Users, value: user?.network_size || 0, label: 'Rede' },
    { icon: DollarSign, value: formatCurrency(user?.available_balance || 0), label: 'Saldo' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Light Theme */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-sidebar bg-white z-50 flex flex-col border-r border-slate-200 transition-transform duration-300 ease-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Profile Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-main to-blue-400 overflow-hidden ring-4 ring-blue-50">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            
            {/* Name & Role */}
            <h3 className="font-heading font-bold text-lg text-slate-900 truncate max-w-full">
              {user?.name || 'Usuário'}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {ACCESS_LEVELS[accessLevel]?.name || 'Usuário'}
            </p>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-4 mt-4 w-full">
              {userStats.map((stat, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <stat.icon className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-sm font-bold text-slate-900">{stat.value}</span>
                  <span className="text-xs text-slate-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" data-testid="sidebar-nav">
          {menuItems.map((item, index) => {
            if (item.section) {
              return (
                <div key={`section-${index}`} className="pt-4 pb-2 px-3 first:pt-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {item.section}
                  </span>
                </div>
              );
            }

            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                data-testid={`nav-${item.path.replace('/', '')}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-brand-main text-white shadow-lg shadow-brand-main/25" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <Link
            to="/store"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <Store className="w-5 h-5" strokeWidth={1.5} />
            <span>Ir para Loja</span>
          </Link>
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <UserCircle className="w-5 h-5" strokeWidth={1.5} />
            <span>Meu Perfil</span>
          </Link>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
