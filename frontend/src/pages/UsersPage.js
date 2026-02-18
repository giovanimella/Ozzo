import React, { useState, useEffect } from 'react';
import { useAuth, ACCESS_LEVELS } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatDate, formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Search, UserPlus, Edit2, Trash2, X, Users,
  ChevronLeft, ChevronRight, Mail, Phone, Eye, 
  CheckCircle, XCircle, Shield, Save, UserCog
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ access_level: '', status: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    access_level: 5,
    status: 'active',
    cpf: '',
    available_balance: 0,
    blocked_balance: 0,
    points: 0,
    supervisor_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchSupervisors();
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
        setTotalUsers(data.total);
      }
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/supervisors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSupervisors(data.supervisors || []);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      access_level: 5,
      status: 'active',
      cpf: '',
      available_balance: 0,
      blocked_balance: 0,
      points: 0
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      access_level: user.access_level,
      status: user.status || 'active',
      cpf: user.cpf || '',
      available_balance: user.available_balance || 0,
      blocked_balance: user.blocked_balance || 0,
      points: user.points || 0
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update user
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        
        const res = await fetch(`${API_URL}/api/users/${editingUser.user_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        if (res.ok) {
          toast.success('Usuário atualizado com sucesso!');
          fetchUsers();
          closeModal();
        } else {
          const error = await res.json();
          toast.error(error.detail || 'Erro ao atualizar usuário');
        }
      } else {
        // Create user
        if (!formData.password) {
          toast.error('Senha é obrigatória para novo usuário');
          return;
        }
        
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          toast.success('Usuário criado com sucesso!');
          fetchUsers();
          closeModal();
        } else {
          const error = await res.json();
          toast.error(error.detail || 'Erro ao criar usuário');
        }
      }
    } catch (error) {
      toast.error('Erro ao salvar usuário');
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Usuário ${newStatus === 'active' ? 'ativado' : 'suspenso'}!`);
        fetchUsers();
      }
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700',
      suspended: 'bg-amber-100 text-amber-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      active: 'Ativo',
      suspended: 'Suspenso',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getRoleBadge = (level) => {
    const colors = {
      0: 'bg-red-100 text-red-700',
      1: 'bg-purple-100 text-purple-700',
      2: 'bg-blue-100 text-blue-700',
      3: 'bg-indigo-100 text-indigo-700',
      4: 'bg-emerald-100 text-emerald-700',
      5: 'bg-slate-100 text-slate-700',
      6: 'bg-amber-100 text-amber-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[level] || colors[5]}`}>
        {ACCESS_LEVELS[level]?.name || 'Usuário'}
      </span>
    );
  };

  return (
    <AppLayout title="Usuários" subtitle="Gerencie todos os usuários do sistema">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total de Usuários" value={totalUsers} color="blue" />
          <StatCard icon={CheckCircle} label="Ativos" value={users.filter(u => u.status === 'active').length} color="green" />
          <StatCard icon={XCircle} label="Suspensos" value={users.filter(u => u.status === 'suspended').length} color="amber" />
          <StatCard icon={Shield} label="Admins" value={users.filter(u => u.access_level <= 1).length} color="purple" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-main focus:border-brand-main"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                Buscar
              </button>
            </form>

            <div className="flex gap-2">
              <select
                value={filter.access_level}
                onChange={(e) => setFilter({ ...filter, access_level: e.target.value })}
                className="h-10 px-3 border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Todos os níveis</option>
                {Object.entries(ACCESS_LEVELS).map(([level, info]) => (
                  <option key={level} value={level}>{info.name}</option>
                ))}
              </select>

              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="h-10 px-3 border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="suspended">Suspensos</option>
                <option value="cancelled">Cancelados</option>
              </select>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-brand-main text-white rounded-lg hover:bg-blue-700 transition-colors"
                data-testid="create-user-btn"
              >
                <UserPlus className="w-4 h-4" />
                Novo Usuário
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <DashCard noPadding>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-brand-main border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Usuário</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Nível</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Status</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Saldo</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Cadastro</th>
                      <th className="text-right p-4 font-medium text-slate-600 text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.user_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-main/10 flex items-center justify-center">
                              <span className="text-brand-main font-bold">
                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{getRoleBadge(user.access_level)}</td>
                        <td className="p-4">{getStatusBadge(user.status)}</td>
                        <td className="p-4">
                          <p className="font-medium text-slate-900">{formatCurrency(user.available_balance || 0)}</p>
                          <p className="text-xs text-slate-500">Bloq: {formatCurrency(user.blocked_balance || 0)}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{formatDate(user.created_at)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => handleStatusChange(user.user_id, 'suspended')}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Suspender"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(user.user_id, 'active')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Ativar"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashCard>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="font-heading font-bold text-xl text-slate-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                
                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Telefone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
                
                <Input
                  label="CPF"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha *"}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nível de Acesso *</label>
                  <select
                    value={formData.access_level}
                    onChange={(e) => setFormData({ ...formData, access_level: parseInt(e.target.value) })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-main"
                    required
                  >
                    {Object.entries(ACCESS_LEVELS).map(([level, info]) => (
                      <option key={level} value={level}>{info.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-main"
                  >
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                
                <Input
                  label="Pontos"
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                />
              </div>

              {editingUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <Input
                    label="Saldo Disponível (R$)"
                    type="number"
                    step="0.01"
                    value={formData.available_balance}
                    onChange={(e) => setFormData({ ...formData, available_balance: parseFloat(e.target.value) || 0 })}
                  />
                  
                  <Input
                    label="Saldo Bloqueado (R$)"
                    type="number"
                    step="0.01"
                    value={formData.blocked_balance}
                    onChange={(e) => setFormData({ ...formData, blocked_balance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 px-5 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-main text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
