import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  FileText, Search, Filter, ChevronLeft, ChevronRight,
  User, Settings, Package, ShoppingBag, Wallet, Network
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function LogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (actionFilter) params.append('action', actionFilter);
      if (search) params.append('user_id', search);

      const res = await fetch(`${API_URL}/api/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pages || 1);
      }
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('user')) return User;
    if (action.includes('product')) return Package;
    if (action.includes('order')) return ShoppingBag;
    if (action.includes('withdrawal') || action.includes('commission')) return Wallet;
    if (action.includes('setting')) return Settings;
    if (action.includes('network') || action.includes('qualification')) return Network;
    return FileText;
  };

  const getActionLabel = (action) => {
    const labels = {
      'user_registered': 'Novo usuário registrado',
      'user_updated': 'Usuário atualizado',
      'user_converted': 'Usuário convertido',
      'product_created': 'Produto criado',
      'product_updated': 'Produto atualizado',
      'product_deleted': 'Produto excluído',
      'order_status_updated': 'Status do pedido atualizado',
      'withdrawal_updated': 'Saque atualizado',
      'settings_updated': 'Configurações atualizadas',
      'commissions_released': 'Comissões liberadas',
      'commissions_reversed': 'Comissões estornadas',
      'qualifications_checked': 'Qualificações verificadas',
      'ambassador_commission_updated': 'Comissão de embaixador atualizada',
    };
    return labels[action] || action.replace(/_/g, ' ');
  };

  const getActionBadge = (action) => {
    if (action.includes('created') || action.includes('registered')) {
      return <Badge variant="success">Criação</Badge>;
    }
    if (action.includes('updated') || action.includes('converted')) {
      return <Badge variant="info">Atualização</Badge>;
    }
    if (action.includes('deleted') || action.includes('reversed') || action.includes('cancelled')) {
      return <Badge variant="error">Remoção</Badge>;
    }
    return <Badge variant="default">Sistema</Badge>;
  };

  const actionTypes = [
    { value: '', label: 'Todos' },
    { value: 'user_registered', label: 'Registros' },
    { value: 'user_updated', label: 'Atualizações de Usuário' },
    { value: 'user_converted', label: 'Conversões' },
    { value: 'product_created', label: 'Produtos Criados' },
    { value: 'product_updated', label: 'Produtos Atualizados' },
    { value: 'order_status_updated', label: 'Pedidos' },
    { value: 'withdrawal_updated', label: 'Saques' },
    { value: 'settings_updated', label: 'Configurações' },
    { value: 'commissions_released', label: 'Comissões Liberadas' },
  ];

  return (
    <AppLayout title="Page">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="logs-title">
            Logs de Auditoria
          </h1>
          <p className="text-slate-600">Histórico de todas as ações do sistema</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar por ID do usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full md:w-64"
              >
                {actionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
              
              <Button onClick={fetchLogs}>
                <Filter className="w-4 h-4" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const Icon = getActionIcon(log.action);
                  return (
                    <div key={log.log_id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-primary-main">
                              {getActionLabel(log.action)}
                            </span>
                            {getActionBadge(log.action)}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {formatDateTime(log.created_at)}
                          </p>
                          {log.details && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-xs font-mono text-slate-600 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          )}
                        </div>
                        {log.user_id && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Usuário</p>
                            <p className="text-sm font-mono">{log.user_id.slice(-8)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100">
                <p className="text-sm text-slate-600">Página {page} de {totalPages}</p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
