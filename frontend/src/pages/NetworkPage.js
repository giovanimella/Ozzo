import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Users, ChevronRight, ChevronDown, User, TrendingUp, 
  UserPlus, Share2, Copy, RefreshCw, Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function NetworkNode({ node, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const levelColors = {
    0: 'bg-gradient-to-r from-brand-main to-blue-600 text-white',
    1: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300',
    2: 'bg-blue-50 border-blue-200 hover:border-blue-300',
    3: 'bg-purple-50 border-purple-200 hover:border-purple-300',
  };

  const avatarColors = {
    0: 'bg-white/20 text-white',
    1: 'bg-emerald-500 text-white',
    2: 'bg-blue-500 text-white',
    3: 'bg-purple-500 text-white',
  };

  return (
    <div className="relative">
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border active:scale-[0.99]",
          level === 0 ? levelColors[0] : levelColors[Math.min(level, 3)] || 'bg-slate-50 border-slate-200'
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{ marginLeft: Math.min(level, 4) * 16 }}
      >
        {hasChildren ? (
          <span className={level === 0 ? 'text-white/70' : 'text-slate-400'}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        ) : (
          <span className="w-4" />
        )}
        
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
          avatarColors[Math.min(level, 3)] || 'bg-slate-400 text-white'
        )}>
          {node.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium truncate text-sm",
            level === 0 ? 'text-white' : 'text-slate-800'
          )}>
            {node.name}
          </p>
          <p className={cn(
            "text-xs truncate",
            level === 0 ? 'text-white/70' : 'text-slate-500'
          )}>
            {node.email}
          </p>
        </div>
        
        <div className="text-right flex-shrink-0">
          <Badge 
            variant={node.status === 'active' ? 'success' : 'warning'}
            className="text-[10px] px-2 py-0.5"
          >
            {node.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
          <p className={cn(
            "text-[10px] mt-1",
            level === 0 ? 'text-white/60' : 'text-slate-400'
          )}>
            Nível {level + 1}
          </p>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-2 space-y-2 relative">
          <div 
            className="absolute left-8 top-0 w-px bg-slate-200"
            style={{ height: 'calc(100% - 12px)', marginLeft: Math.min(level, 4) * 16 }}
          />
          {node.children.map((child) => (
            <NetworkNode key={child.user_id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkPage() {
  const { token, user } = useAuth();
  const [tree, setTree] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const [treeRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/network/tree`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/network/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (treeRes.ok) {
        const data = await treeRes.json();
        setTree(data.tree || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      toast.error('Erro ao carregar rede');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/register?sponsor=${user?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  return (
    <AppLayout title="Minha Rede">
      <div className="space-y-4 lg:space-y-6">
        {/* Quick Actions - Mobile */}
        <div className="flex gap-2 lg:hidden">
          <Link to="/invite" className="flex-1">
            <Button variant="default" className="w-full gap-2">
              <UserPlus className="w-4 h-4" />
              Convidar
            </Button>
          </Link>
          <Button variant="outline" onClick={copyInviteLink} className="gap-2">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={fetchNetworkData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Header Actions - Desktop */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <p className="text-slate-500">Visualize e gerencie sua equipe</p>
          </div>
          <div className="flex gap-2">
            <Link to="/invite">
              <Button variant="default" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Convidar Revendedor
              </Button>
            </Link>
            <Button variant="outline" onClick={copyInviteLink} className="gap-2">
              <Copy className="w-4 h-4" />
              Copiar Link
            </Button>
          </div>
        </div>

        {/* Stats Grid - Horizontal scroll on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible">
          <StatCard
            icon={Users}
            label="Total"
            value={stats?.total_network || 0}
            color="blue"
            compact
            className="min-w-[140px] lg:min-w-0"
          />
          <StatCard
            icon={User}
            label="1º Nível"
            value={stats?.level_1 || 0}
            color="green"
            compact
            className="min-w-[140px] lg:min-w-0"
          />
          <StatCard
            icon={User}
            label="2º Nível"
            value={stats?.level_2 || 0}
            color="blue"
            compact
            className="min-w-[140px] lg:min-w-0"
          />
          <StatCard
            icon={User}
            label="3º Nível"
            value={stats?.level_3 || 0}
            color="purple"
            compact
            className="min-w-[140px] lg:min-w-0"
          />
          <StatCard
            icon={TrendingUp}
            label="Ativos"
            value={stats?.active_this_month || 0}
            color="green"
            compact
            className="min-w-[140px] lg:min-w-0"
          />
        </div>

        {/* Search - Mobile */}
        <div className="lg:hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar na rede..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm"
            />
          </div>
        </div>

        {/* Tree */}
        <DashCard 
          title="Estrutura da Rede" 
          icon={Users}
          action={
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-32"
                />
              </div>
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-main" />
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Sua rede está vazia</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">
                Convide revendedores para começar a construir sua equipe
              </p>
              <Link to="/invite">
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Convidar Primeiro Revendedor
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {tree.map((node) => (
                <NetworkNode key={node.user_id} node={node} />
              ))}
            </div>
          )}
        </DashCard>

        {/* Commission Levels - Cards */}
        <DashCard title="Como Funcionam as Comissões" icon={TrendingUp}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <p className="font-bold text-emerald-700">1º Nível</p>
                  <p className="text-2xl font-bold text-emerald-600">10%</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Comissão sobre vendas dos seus indicados diretos
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <p className="font-bold text-blue-700">2º Nível</p>
                  <p className="text-2xl font-bold text-blue-600">5%</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Comissão sobre vendas dos indicados dos seus indicados
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <p className="font-bold text-purple-700">3º Nível</p>
                  <p className="text-2xl font-bold text-purple-600">5%</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Comissão sobre vendas da terceira geração
              </p>
            </div>
          </div>
        </DashCard>
      </div>
    </AppLayout>
  );
}
