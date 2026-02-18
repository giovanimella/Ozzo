import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  FileSpreadsheet, Download, RefreshCw, Calendar,
  DollarSign, Users, FileText, Filter, Search,
  Wallet, CreditCard, Building, Copy, Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WithdrawalsReportPage() {
  const { token } = useAuth();
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('approved');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [statusFilter]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/withdrawals/report?status=${statusFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data.report || []);
        setTotalAmount(data.total_amount || 0);
        setTotalCount(data.total_count || 0);
      }
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/withdrawals/export?status=${statusFilter}&format=csv`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saques_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Relatório exportado!');
      }
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusLabels = {
    approved: 'Aprovados',
    pending: 'Pendentes',
    rejected: 'Rejeitados',
    paid: 'Pagos'
  };

  return (
    <AppLayout title="Relatório de Saques">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-500">
              Relatório para processamento de pagamentos pelo financeiro
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchReport} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={exportCSV} disabled={exporting || report.length === 0}>
              <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-bounce' : ''}`} />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={DollarSign}
            label="Total a Pagar"
            value={formatCurrency(totalAmount)}
            color="green"
          />
          <StatCard
            icon={Users}
            label="Quantidade de Saques"
            value={totalCount}
            color="blue"
          />
          <StatCard
            icon={FileSpreadsheet}
            label="Status do Filtro"
            value={statusLabels[statusFilter]}
            color="purple"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex gap-2">
            {['approved', 'pending', 'rejected', 'paid'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {statusLabels[status]}
              </Button>
            ))}
          </div>
        </div>

        {/* Report Table */}
        <DashCard 
          title="Detalhes dos Saques" 
          icon={FileText}
          action={
            <span className="text-sm text-slate-500">
              {totalCount} {totalCount === 1 ? 'saque' : 'saques'}
            </span>
          }
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-main" />
            </div>
          ) : report.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum saque encontrado</p>
              <p className="text-sm text-slate-400 mt-1">
                Não há saques com status "{statusLabels[statusFilter]}"
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {report.map((item) => (
                <div 
                  key={item.withdrawal_id} 
                  className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.name}</h4>
                      <p className="text-sm text-slate-500">{item.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">
                        {formatCurrency(item.amount)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400">CPF</p>
                      <p className="text-sm font-medium text-slate-700">{item.cpf || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Telefone</p>
                      <p className="text-sm font-medium text-slate-700">{item.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">ID do Saque</p>
                      <p className="text-sm font-mono text-slate-600">{item.withdrawal_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">ID do Usuário</p>
                      <p className="text-sm font-mono text-slate-600">{item.user_id}</p>
                    </div>
                  </div>

                  {/* Bank Info */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="w-4 h-4 text-slate-600" />
                      <h5 className="font-medium text-slate-700">Dados Bancários</h5>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div>
                        <p className="text-xs text-slate-400">Banco</p>
                        <p className="text-sm font-medium">{item.bank_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Código</p>
                        <p className="text-sm font-medium">{item.bank_code || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Agência</p>
                        <p className="text-sm font-medium">{item.agency || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Conta</p>
                        <p className="text-sm font-medium">{item.account || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Tipo</p>
                        <p className="text-sm font-medium capitalize">{item.account_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Chave PIX</p>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium truncate">{item.pix_key || '-'}</p>
                          {item.pix_key && (
                            <button
                              onClick={() => copyToClipboard(item.pix_key, item.withdrawal_id)}
                              className="p-1 hover:bg-slate-200 rounded transition-colors"
                              title="Copiar PIX"
                            >
                              {copiedId === item.withdrawal_id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashCard>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Como usar este relatório
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Filtre por "Aprovados" para ver os saques prontos para pagamento</li>
            <li>2. Clique em "Exportar CSV" para baixar a planilha com todos os dados</li>
            <li>3. Use os dados bancários para processar os pagamentos</li>
            <li>4. Após pagar, altere o status do saque para "Pago" na página de Saques</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
