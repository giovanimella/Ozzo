import React, { useState, useEffect } from 'react';
import { useAuth, ACCESS_LEVELS } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Search, Filter, UserPlus, MoreHorizontal, 
  ChevronLeft, ChevronRight, Mail, Phone, Eye
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ access_level: '', status: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter.access_level) params.append('access_level', filter.access_level);
      if (filter.status) params.append('status', filter.status);
      if (search) params.append('search', search);

      const res = await fetch(`${API_URL}/api/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.pages);
      }
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      suspended: 'warning',
      cancelled: 'error'
    };
    const labels = {
      active: 'Ativo',
      suspended: 'Suspenso',
      cancelled: 'Cancelado'
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="users-title">
              Usuários
            </h1>
            <p className="text-slate-600">Gerencie todos os usuários do sistema</p>
          </div>
          
          <Button onClick={() => setShowInviteModal(true)} data-testid="invite-user-btn">
            <UserPlus className="w-4 h-4" />
            Convidar Usuário
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={filter.access_level}
                onChange={(e) => setFilter(prev => ({ ...prev, access_level: e.target.value }))}
                className="w-full md:w-48"
              >
                <option value="">Todos os níveis</option>
                {Object.entries(ACCESS_LEVELS).map(([level, info]) => (
                  <option key={level} value={level}>{info.name}</option>
                ))}
              </Select>
              
              <Select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="w-full md:w-40"
              >
                <option value="">Todos status</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="cancelled">Cancelado</option>
              </Select>
              
              <Button type="submit">
                <Filter className="w-4 h-4" />
                Filtrar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left p-4 font-medium text-slate-600">Usuário</th>
                    <th className="text-left p-4 font-medium text-slate-600">Nível</th>
                    <th className="text-left p-4 font-medium text-slate-600">Status</th>
                    <th className="text-left p-4 font-medium text-slate-600">Cadastro</th>
                    <th className="text-left p-4 font-medium text-slate-600">Código</th>
                    <th className="text-right p-4 font-medium text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Carregando...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.user_id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-main text-white flex items-center justify-center font-medium">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-primary-main">{user.name}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{ACCESS_LEVELS[user.access_level]?.name || 'N/A'}</span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-sm">{user.referral_code || '-'}</span>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" data-testid={`view-user-${user.user_id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100">
                <p className="text-sm text-slate-600">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Modal - simplified */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-heading font-bold text-xl mb-4">Convidar Usuário</h2>
            <form className="space-y-4">
              <Input label="Nome" placeholder="Nome do convidado" />
              <Input label="Email" type="email" placeholder="email@exemplo.com" />
              <Select label="Tipo de Conta">
                <option value={3}>Líder de Equipe</option>
                <option value={4}>Revendedor</option>
                <option value={6}>Embaixador</option>
              </Select>
              <div className="flex gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowInviteModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Enviar Convite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
