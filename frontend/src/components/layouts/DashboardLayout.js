import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ACCESS_LEVELS } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Users, ShoppingBag, Wallet, Settings, 
  Network, LogOut, Menu, X, ChevronDown, Package,
  FileText, Bell, UserCircle, BarChart3, ClipboardList,
  Trophy, Target, Link2
} from 'lucide-react';
import { cn } from '../../lib/utils';

const getMenuItems = (accessLevel) => {
  const items = [];

  // Dashboard - all users
  items.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' });

  // Admin Técnico (0) e Admin Geral (1)
  if (accessLevel <= 1) {
    items.push({ icon: Users, label: 'Usuários', path: '/users' });
    items.push({ icon: ClipboardList, label: 'Pedidos', path: '/orders' });
    items.push({ icon: BarChart3, label: 'Relatórios', path: '/reports' });
    items.push({ icon: Trophy, label: 'Ranking', path: '/ranking' });
    items.push({ icon: Target, label: 'Metas', path: '/goals' });
    items.push({ icon: Wallet, label: 'Saques', path: '/withdrawals' });
    items.push({ icon: FileText, label: 'Logs', path: '/logs' });
  }

  // Admin Técnico (0) only
  if (accessLevel === 0) {
    items.push({ icon: Settings, label: 'Configurações', path: '/settings' });
  }

  // Supervisor (2)
  if (accessLevel === 2) {
    items.push({ icon: Users, label: 'Minha Carteira', path: '/my-portfolio' });
    items.push({ icon: Trophy, label: 'Ranking', path: '/ranking' });
  }

  // Líder (3) e Revendedor (4)
  if (accessLevel === 3 || accessLevel === 4) {
    items.push({ icon: Network, label: 'Minha Rede', path: '/network' });
    items.push({ icon: Trophy, label: 'Ranking', path: '/ranking' });
    items.push({ icon: Target, label: 'Metas', path: '/goals' });
    items.push({ icon: Link2, label: 'Link de Indicação', path: '/referral-links' });
    items.push({ icon: ShoppingBag, label: 'Meus Pedidos', path: '/my-orders' });
    items.push({ icon: Wallet, label: 'Minha Carteira', path: '/wallet' });
  }

  // Cliente (5)
  if (accessLevel === 5) {
    items.push({ icon: ShoppingBag, label: 'Meus Pedidos', path: '/my-orders' });
    items.push({ icon: Link2, label: 'Meu Link', path: '/referral-links' });
    items.push({ icon: Target, label: 'Metas', path: '/goals' });
    items.push({ icon: Wallet, label: 'Minhas Comissões', path: '/wallet' });
  }

  // Embaixador (6)
  if (accessLevel === 6) {
    items.push({ icon: ShoppingBag, label: 'Meus Pedidos', path: '/my-orders' });
    items.push({ icon: Link2, label: 'Meu Link', path: '/referral-links' });
    items.push({ icon: Target, label: 'Metas', path: '/goals' });
    items.push({ icon: Wallet, label: 'Minhas Comissões', path: '/wallet' });
  }

  // Produtos e Loja - Admin pode gerenciar, outros podem ver
  if (accessLevel <= 1) {
    items.push({ icon: Package, label: 'Produtos', path: '/products' });
  }

  // Perfil - all users
  items.push({ icon: UserCircle, label: 'Meu Perfil', path: '/profile' });

  return items;
};

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = getMenuItems(user?.access_level ?? 99);
  const accessInfo = ACCESS_LEVELS[user?.access_level] || { name: 'Usuário' };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 navy-gradient text-slate-300 transition-transform duration-300 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="font-heading font-bold text-white text-lg">Vanguard</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-white font-medium truncate">{user?.name}</p>
          <p className="text-sm text-slate-400">{accessInfo.name}</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
                  isActive 
                    ? 'bg-white/10 text-white font-semibold border-r-4 border-accent-main' 
                    : 'hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-4">
            {/* Referral code for resellers */}
            {user?.access_level && user.access_level <= 4 && user.referral_code && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <span className="text-sm text-slate-500">Código:</span>
                <span className="text-sm font-semibold text-primary-main">{user.referral_code}</span>
              </div>
            )}

            {/* User dropdown */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-main text-white flex items-center justify-center">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-700">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 shadow-lg z-50 lg:hidden flex justify-around items-center">
        {menuItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 p-2',
                isActive ? 'text-primary-main' : 'text-slate-400'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
