import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Users, Search, RefreshCw, ChevronLeft, ChevronRight,
  Phone, Mail, DollarSign, TrendingUp, UserCheck, UserX, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SupervisedUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    totalVolume: 0
  });

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/supervisor/users?page=${page}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.pages || 1);
        setTotalUsers(data.total || 0);

        // Calculate stats
        const active = data.users?.filter(u => u.status === 'active').length || 0;
        const suspended = data.users?.filter(u => u.status === 'suspended').length || 0;
        const totalVolume = data.users?.reduce((acc, u) => acc + (u.personal_volume || 0) + (u.team_volume || 0), 0) || 0;
        
        setStats({
          total: data.total || 0,
          active,
          suspended,
          totalVolume
        });
      }
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: { variant: 'success', label: 'Ativo' },
      suspended: { variant: 'warning', label: 'Suspenso' },
      cancelled: { variant: 'destructive', label: 'Cancelado' }
    };
    const style = styles[status] || { variant: 'secondary', label: status };
    return <Badge variant={style.variant}>{style.label}</Badge>;
  };

  const filteredUsers = users.filter(user => 
    !search || 
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Minha Carteira de Revendedores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-500">
              Gerencie os revendedores e líderes sob sua supervisão
            </p>
          </div>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Supervisionados"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={UserCheck}
            label="Ativos"
            value={stats.active}
            color="green"
          />
          <StatCard
            icon={UserX}
            label="Suspensos"
            value={stats.suspended}
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Volume Total"
            value={formatCurrency(stats.totalVolume)}
            color="purple"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        </div>

        {/* Users List */}
        <DashCard title="Revendedores Supervisionados" icon={Users}>
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-main" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {search ? 'Nenhum usuário encontrado para esta busca' : 'Nenhum usuário sob sua supervisão'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {!search && 'O administrador pode atribuir revendedores a você'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.user_id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-main/10 flex items-center justify-center">
                          <span className="text-brand-main font-bold">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(user.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-400">Saldo Disponível</p>
                        <p className="font-semibold text-emerald-600">
                          {formatCurrency(user.available_balance || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Volume Pessoal</p>
                        <p className="font-semibold text-slate-700">
                          {formatCurrency(user.personal_volume || 0)}
                        </p>
                      </div>
                    </div>
                    
                    {user.phone && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                        <Phone className="w-4 h-4" />
                        {user.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Usuário</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Contato</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Status</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Saldo</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Volume</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.user_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-main/10 flex items-center justify-center">
                              <span className="text-brand-main font-bold">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600">{user.phone || '-'}</p>
                        </td>
                        <td className="p-4">{getStatusBadge(user.status)}</td>
                        <td className="p-4">
                          <p className="font-medium text-emerald-600">
                            {formatCurrency(user.available_balance || 0)}
                          </p>
                          <p className="text-xs text-slate-400">
                            Bloq: {formatCurrency(user.blocked_balance || 0)}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-slate-700">
                            {formatCurrency(user.personal_volume || 0)}
                          </p>
                          <p className="text-xs text-slate-400">
                            Equipe: {formatCurrency(user.team_volume || 0)}
                          </p>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {formatDate(user.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashCard>
      </div>
    </AppLayout>
  );
}
