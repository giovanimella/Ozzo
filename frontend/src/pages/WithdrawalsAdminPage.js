import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Wallet, CheckCircle, XCircle, Clock, 
  ChevronLeft, ChevronRight, Eye, User
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function WithdrawalsAdminPage() {
  const { token } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [page, statusFilter]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_URL}/api/wallet/withdrawals?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.withdrawals);
        setTotalPages(data.pages || 1);
      }
    } catch (error) {
      toast.error('Erro ao carregar saques');
    } finally {
      setLoading(false);
    }
  };

  const updateWithdrawalStatus = async (withdrawalId, newStatus) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/withdrawals/${withdrawalId}?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(`Saque ${newStatus === 'approved' ? 'aprovado' : newStatus === 'paid' ? 'pago' : 'rejeitado'}!`);
        fetchWithdrawals();
        setSelectedWithdrawal(null);
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { variant: 'warning', label: 'Pendente', icon: Clock },
      approved: { variant: 'info', label: 'Aprovado', icon: CheckCircle },
      paid: { variant: 'success', label: 'Pago', icon: CheckCircle },
      rejected: { variant: 'error', label: 'Rejeitado', icon: XCircle },
    };
    const { variant, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // Summary stats
  const stats = {
    pending: withdrawals.filter(w => w.status === 'pending').length,
    totalPending: withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0),
  };

  return (
    <AppLayout title="Page">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="withdrawals-admin-title">
            Gestão de Saques
          </h1>
          <p className="text-slate-600">Aprove ou rejeite solicitações de saque</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-2xl font-heading font-bold text-primary-main">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Valor Pendente</p>
                  <p className="text-2xl font-heading font-bold text-primary-main">
                    {formatCurrency(stats.totalPending)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['pending', 'approved', 'paid', 'rejected', ''].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setStatusFilter(status); setPage(1); }}
            >
              {status === '' ? 'Todos' : 
               status === 'pending' ? 'Pendentes' :
               status === 'approved' ? 'Aprovados' :
               status === 'paid' ? 'Pagos' : 'Rejeitados'}
            </Button>
          ))}
        </div>

        {/* Withdrawals List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhum saque encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-4 font-medium text-slate-600">ID</th>
                      <th className="text-left p-4 font-medium text-slate-600">Data</th>
                      <th className="text-left p-4 font-medium text-slate-600">Valor</th>
                      <th className="text-left p-4 font-medium text-slate-600">Taxa</th>
                      <th className="text-left p-4 font-medium text-slate-600">Líquido</th>
                      <th className="text-left p-4 font-medium text-slate-600">Status</th>
                      <th className="text-right p-4 font-medium text-slate-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.withdrawal_id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-4">
                          <span className="font-mono text-sm">
                            #{withdrawal.withdrawal_id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {formatDate(withdrawal.created_at)}
                        </td>
                        <td className="p-4 font-medium">
                          {formatCurrency(withdrawal.amount)}
                        </td>
                        <td className="p-4 text-sm text-red-500">
                          -{formatCurrency(withdrawal.fee)}
                        </td>
                        <td className="p-4 font-medium text-emerald-600">
                          {formatCurrency(withdrawal.net_amount)}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(withdrawal.status)}
                        </td>
                        <td className="p-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedWithdrawal(withdrawal)}
                          >
                            <Eye className="w-4 h-4" />
                            {withdrawal.status === 'pending' ? 'Analisar' : 'Ver'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* Withdrawal Detail Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-xl text-primary-main">
                  Saque #{selectedWithdrawal.withdrawal_id.slice(-8).toUpperCase()}
                </h2>
                {getStatusBadge(selectedWithdrawal.status)}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Amount Info */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Valor Solicitado</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Taxa</p>
                  <p className="font-bold text-lg text-red-600">-{formatCurrency(selectedWithdrawal.fee)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Valor Líquido</p>
                  <p className="font-bold text-lg text-emerald-600">{formatCurrency(selectedWithdrawal.net_amount)}</p>
                </div>
              </div>

              {/* Bank Info */}
              {selectedWithdrawal.bank_info && (
                <div>
                  <h3 className="font-medium text-primary-main mb-3">Dados Bancários</h3>
                  <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Banco:</span>
                      <span className="font-medium">{selectedWithdrawal.bank_info.bank || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agência:</span>
                      <span className="font-medium">{selectedWithdrawal.bank_info.agency || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Conta:</span>
                      <span className="font-medium">{selectedWithdrawal.bank_info.account || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tipo:</span>
                      <span className="font-medium">{selectedWithdrawal.bank_info.account_type === 'poupanca' ? 'Poupança' : 'Corrente'}</span>
                    </div>
                    {selectedWithdrawal.bank_info.pix_key && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">PIX:</span>
                        <span className="font-medium">{selectedWithdrawal.bank_info.pix_key}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="font-medium text-primary-main mb-3">Histórico</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-slate-500">Solicitado em {formatDate(selectedWithdrawal.created_at)}</span>
                  </div>
                  {selectedWithdrawal.processed_at && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-slate-500">Processado em {formatDate(selectedWithdrawal.processed_at)}</span>
                    </div>
                  )}
                  {selectedWithdrawal.paid_at && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-500">Pago em {formatDate(selectedWithdrawal.paid_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200">
              {selectedWithdrawal.status === 'pending' && (
                <div className="flex gap-3 mb-4">
                  <Button 
                    variant="danger" 
                    className="flex-1"
                    onClick={() => updateWithdrawalStatus(selectedWithdrawal.withdrawal_id, 'rejected')}
                    loading={processing}
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => updateWithdrawalStatus(selectedWithdrawal.withdrawal_id, 'approved')}
                    loading={processing}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar
                  </Button>
                </div>
              )}
              
              {selectedWithdrawal.status === 'approved' && (
                <Button 
                  className="w-full mb-4"
                  onClick={() => updateWithdrawalStatus(selectedWithdrawal.withdrawal_id, 'paid')}
                  loading={processing}
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Pagamento
                </Button>
              )}
              
              <Button variant="secondary" onClick={() => setSelectedWithdrawal(null)} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
