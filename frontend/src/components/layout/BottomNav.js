import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Wallet, Users, ShoppingBag, 
  User, Store, Network, Trophy, Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Get navigation items based on access level
const getNavItems = (accessLevel) => {
  // Admin (0, 1)
  if (accessLevel <= 1) {
    return [
      { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
      { icon: Users, label: 'Usuários', path: '/users' },
      { icon: ShoppingBag, label: 'Pedidos', path: '/orders' },
      { icon: Wallet, label: 'Saques', path: '/withdrawals' },
      { icon: User, label: 'Perfil', path: '/profile' },
    ];
  }
  
  // Supervisor (2)
  if (accessLevel === 2) {
    return [
      { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
      { icon: Users, label: 'Carteira', path: '/my-portfolio' },
      { icon: Trophy, label: 'Ranking', path: '/ranking' },
      { icon: Store, label: 'Loja', path: '/store' },
      { icon: User, label: 'Perfil', path: '/profile' },
    ];
  }
  
  // Líder (3) e Revendedor (4)
  if (accessLevel === 3 || accessLevel === 4) {
    return [
      { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
      { icon: Network, label: 'Rede', path: '/network' },
      { icon: Wallet, label: 'Carteira', path: '/wallet' },
      { icon: Store, label: 'Loja', path: '/store' },
      { icon: User, label: 'Perfil', path: '/profile' },
    ];
  }
  
  // Cliente (5) e Embaixador (6)
  return [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: ShoppingBag, label: 'Pedidos', path: '/my-orders' },
    { icon: Wallet, label: 'Ganhos', path: '/wallet' },
    { icon: Store, label: 'Loja', path: '/store' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];
};

export default function BottomNav() {
  const { accessLevel, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Don't show on public pages or if not authenticated
  if (!isAuthenticated) return null;
  
  const publicPaths = ['/', '/login', '/register', '/store'];
  if (publicPaths.includes(location.pathname)) return null;
  
  const navItems = getNavItems(accessLevel);
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 no-select",
                isActive 
                  ? "text-brand-main" 
                  : "text-slate-400 active:text-slate-600"
              )}
              data-testid={`bottom-nav-${item.path.replace('/', '')}`}
            >
              <div className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                isActive && "bg-brand-main/10"
              )}>
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} 
                  strokeWidth={isActive ? 2 : 1.5} 
                />
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-main" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-colors duration-200",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
