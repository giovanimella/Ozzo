import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  DollarSign, TrendingUp, Clock, CheckCircle, 
  RefreshCw, ArrowUpRight, ArrowDownRight, Filter,
  ChevronLeft, ChevronRight, Calendar, Layers
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CommissionsPage() {
  const { token, user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 15;

  useEffect(() => {
    fetchCommissions();
    fetchSummary();
  }, [page, statusFilter]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`${API_URL}/api/commissions?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCommissions(data.commissions || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/commissions/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      blocked: { variant: 'warning', label: 'Bloqueado', icon: Clock },
      available: { variant: 'success', label: 'Disponível', icon: CheckCircle },
      reversed: { variant: 'destructive', label: 'Estornado', icon: RefreshCw },
      paid: { variant: 'default', label: 'Pago', icon: CheckCircle }
    };
    
    const style = styles[status] || { variant: 'secondary', label: status, icon: Clock };
    const Icon = style.icon;
    
    return (
      <Badge variant={style.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {style.label}
      </Badge>
    );
  };

  const getLevelLabel = (level) => {
    if (level === 0) return 'Indicação Direta';
    return `${level}º Nível`;
  };

  const getLevelColor = (level) => {
    const colors = {
      0: 'text-emerald-600 bg-emerald-50',
      1: 'text-blue-600 bg-blue-50',
      2: 'text-purple-600 bg-purple-50',
      3: 'text-amber-600 bg-amber-50'
    };
    return colors[level] || 'text-slate-600 bg-slate-50';
  };

  const totalPages = Math.ceil(total / limit);

  const statsCards = [
    {
      title: 'Total Disponível',
      value: formatCurrency(summary?.available_balance || 0),
      icon: DollarSign,
      color: 'success',
      subtitle: 'Pronto para saque'
    },
    {
      title: 'Total Bloqueado',
      value: formatCurrency(summary?.blocked_balance || 0),
      icon: Clock,
      color: 'warning',
      subtitle: 'Aguardando liberação (7 dias)'
    },
    {
      title: 'Este Mês',
      value: formatCurrency(summary?.this_month || 0),
      icon: Calendar,
      color: 'primary',
      subtitle: 'Comissões do mês atual'
    },
    {
      title: 'Total de Transações',
      value: total,
      icon: Layers,
      color: 'purple',
      subtitle: 'Comissões recebidas'
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Minhas Comissões</h1>
            <p className="text-slate-500 mt-1">Acompanhe seus ganhos da rede MLM</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => { fetchCommissions(); fetchSummary(); }}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
            <StatCard
              key={index}
              label={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>

        {/* Commission by Level */}
        {summary?.by_level && Object.keys(summary.by_level).length > 0 && (
          <DashCard title="Comissões por Nível" icon={Layers}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary.by_level).map(([level, data]) => (
                <div 
                  key={level} 
                  className={`p-4 rounded-xl ${getLevelColor(parseInt(level))}`}
                >
                  <p className="text-sm font-medium opacity-80">
                    {getLevelLabel(parseInt(level))}
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {formatCurrency(data.total)}
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    {data.count} {data.count === 1 ? 'comissão' : 'comissões'}
                  </p>
                </div>
              ))}
            </div>
          </DashCard>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex gap-2">
            {[
              { value: '', label: 'Todas' },
              { value: 'blocked', label: 'Bloqueadas' },
              { value: 'available', label: 'Disponíveis' },
              { value: 'reversed', label: 'Estornadas' }
            ].map(filter => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(filter.value); setPage(1); }}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Commissions Table */}
        <DashCard 
          title="Histórico de Comissões" 
          icon={TrendingUp}
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-main" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma comissão encontrada</p>
              <p className="text-sm text-slate-400 mt-1">
                Suas comissões aparecerão aqui quando sua rede fizer vendas
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                        Data
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                        Pedido
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                        Nível
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                        Taxa
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                        Base
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                        Valor
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((commission) => (
                      <tr 
                        key={commission.commission_id} 
                        className="border-b border-slate-50 hover:bg-slate-25 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span className="text-sm text-slate-600">
                            {formatDate(commission.created_at)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-mono text-slate-500">
                            {commission.order_id?.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getLevelColor(commission.level)}`}>
                            {getLevelLabel(commission.level)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-slate-700">
                            {commission.rate}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm text-slate-500">
                            {formatCurrency(commission.base_amount)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm font-semibold text-emerald-600">
                            +{formatCurrency(commission.amount)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {getStatusBadge(commission.status)}
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
                    Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
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
                    <span className="flex items-center px-3 text-sm text-slate-600">
                      {page} / {totalPages}
                    </span>
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

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Como funcionam as comissões?</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>• Comissões ficam <strong>bloqueadas por 7 dias</strong> após o pagamento do pedido</li>
                  <li>• Após esse período, o valor é liberado para sua carteira</li>
                  <li>• Se o pedido for cancelado em até 7 dias, a comissão é estornada</li>
                  <li>• Você recebe comissão de até <strong>3 níveis</strong> da sua rede (10%, 5%, 5%)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
