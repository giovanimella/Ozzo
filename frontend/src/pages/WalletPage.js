import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, Clock, 
  CheckCircle, XCircle, RefreshCw, ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WalletPage() {
  const { user, token, updateUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([
        fetch(`${API_URL}/api/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/wallet/withdrawals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (walletRes.ok) {
        const data = await walletRes.json();
        setTransactions(data.transactions || []);
        updateUser({
          available_balance: data.available_balance,
          blocked_balance: data.blocked_balance
        });
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      toast.error('Erro ao carregar carteira');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!user?.bank_info) {
      toast.error('Adicione seus dados bancários no perfil primeiro');
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount) })
      });

      if (res.ok) {
        toast.success('Solicitação de saque enviada!');
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        fetchWalletData();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Erro ao solicitar saque');
      }
    } catch (error) {
      toast.error('Erro ao solicitar saque');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'approved': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'paid': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      paid: 'Pago',
      rejected: 'Rejeitado'
    };
    return labels[status] || status;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="wallet-title">
            Minha Carteira
          </h1>
          <p className="text-slate-600">Gerencie seu saldo e saques</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card highlight className="fade-in">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Disponível para Saque</p>
                  <p className="text-2xl font-heading font-bold text-white">
                    {formatCurrency(user?.available_balance || 0)}
                  </p>
                </div>
              </div>
              <Button 
                variant="gold" 
                className="w-full mt-4"
                onClick={() => setShowWithdrawModal(true)}
                disabled={!user?.available_balance}
                data-testid="request-withdraw-btn"
              >
                Solicitar Saque
              </Button>
            </CardContent>
          </Card>

          <Card className="fade-in stagger-1">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Saldo Bloqueado</p>
                  <p className="text-2xl font-heading font-bold text-primary-main">
                    {formatCurrency(user?.blocked_balance || 0)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Liberado automaticamente após 7 dias da confirmação do pagamento
              </p>
            </CardContent>
          </Card>

          <Card className="fade-in stagger-2">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Total Recebido</p>
                  <p className="text-2xl font-heading font-bold text-primary-main">
                    {formatCurrency(
                      (user?.available_balance || 0) + 
                      (user?.blocked_balance || 0) +
                      withdrawals.filter(w => w.status === 'paid').reduce((sum, w) => sum + w.net_amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Withdrawals */}
        <Card>
          <CardHeader>
            <CardTitle>Saques Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                Nenhum saque solicitado
              </p>
            ) : (
              <div className="space-y-4">
                {withdrawals.slice(0, 5).map((withdrawal) => (
                  <div 
                    key={withdrawal.withdrawal_id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(withdrawal.status)}
                      <div>
                        <p className="font-medium text-primary-main">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDate(withdrawal.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        withdrawal.status === 'paid' ? 'success' :
                        withdrawal.status === 'rejected' ? 'error' :
                        withdrawal.status === 'approved' ? 'info' : 'warning'
                      }>
                        {getStatusLabel(withdrawal.status)}
                      </Badge>
                      {withdrawal.fee > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          Taxa: {formatCurrency(withdrawal.fee)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                Nenhuma transação registrada
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div 
                    key={tx.transaction_id}
                    className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-primary-main">
                          {tx.description}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-heading font-bold text-xl mb-4">Solicitar Saque</h2>
            
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Saldo disponível</p>
              <p className="text-2xl font-bold text-primary-main">
                {formatCurrency(user?.available_balance || 0)}
              </p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <Input
                label="Valor do Saque (R$)"
                type="number"
                step="0.01"
                min="50"
                max={user?.available_balance || 0}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
                data-testid="withdraw-amount"
              />
              
              <p className="text-sm text-slate-500">
                Valor mínimo: R$ 50,00 | Taxa: 5%
              </p>

              {withdrawAmount && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-slate-600">Você receberá:</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(parseFloat(withdrawAmount) * 0.95)}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={withdrawing} className="flex-1">
                  Solicitar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
