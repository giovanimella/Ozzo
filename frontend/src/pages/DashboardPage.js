import React, { useState, useEffect } from 'react';
import { useAuth, ACCESS_LEVELS } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  Users, TrendingUp, Wallet, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, Copy, ExternalLink,
  AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { toast } from '../components/ui/toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DashboardPage() {
  const { user, token, accessLevel } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const endpoint = accessLevel <= 1 ? '/api/dashboard/admin' : '/api/dashboard/reseller';
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/store?ref=${user?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
        </div>
      </DashboardLayout>
    );
  }

  // Admin Dashboard
  if (accessLevel <= 1) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main mb-2" data-testid="dashboard-title">
              Dashboard Administrativo
            </h1>
            <p className="text-slate-600">Visão geral do sistema</p>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="fade-in">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Faturamento do Mês</p>
                    <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                      {formatCurrency(dashboardData?.orders_this_month?.total || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {dashboardData?.orders_this_month?.count || 0} pedidos
                    </p>
                  </div>
                  <div className="w-12 h-12 gold-gradient rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fade-in stagger-1">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Comissões Pendentes</p>
                    <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                      {formatCurrency(dashboardData?.commissions?.pending || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fade-in stagger-2">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Revendedores Ativos</p>
                    <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                      {dashboardData?.active_resellers || 0}
                    </p>
                    <p className="text-sm text-red-500 mt-1">
                      {dashboardData?.suspended_resellers || 0} suspensos
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fade-in stagger-3">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Saques Pendentes</p>
                    <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                      {formatCurrency(dashboardData?.withdrawals_pending?.total || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {dashboardData?.withdrawals_pending?.count || 0} solicitações
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(ACCESS_LEVELS).map(([level, info]) => (
                  <div key={level} className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-heading font-bold text-primary-main">
                      {dashboardData?.user_counts?.[info.slug] || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{info.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Reseller/Leader Dashboard
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="dashboard-title">
              Olá, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-slate-600">
              {ACCESS_LEVELS[user?.access_level]?.name || 'Usuário'}
            </p>
          </div>
          
          {user?.referral_code && (
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-slate-100 rounded-lg">
                <span className="text-sm text-slate-500">Seu código: </span>
                <span className="font-mono font-bold text-primary-main">{user.referral_code}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={copyReferralLink} data-testid="copy-link-btn">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card highlight className="fade-in">
            <CardContent>
              <p className="text-slate-300 mb-2">Saldo Disponível</p>
              <p className="text-3xl font-heading font-bold text-white">
                {formatCurrency(user?.available_balance || 0)}
              </p>
              <div className="mt-4">
                <Button variant="gold" size="sm" className="w-full" data-testid="withdraw-btn">
                  Solicitar Saque
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="fade-in stagger-1">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Saldo Bloqueado</p>
                  <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                    {formatCurrency(user?.blocked_balance || 0)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Liberado em 7 dias</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="fade-in stagger-2">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Comissões do Mês</p>
                  <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                    {formatCurrency(dashboardData?.commissions?.this_month || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 gold-gradient rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Network Stats */}
        {(accessLevel === 3 || accessLevel === 4) && dashboardData?.network && (
          <Card className="fade-in stagger-3">
            <CardHeader>
              <CardTitle>Minha Rede</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-3xl font-heading font-bold text-primary-main">
                    {dashboardData.network.total_network || 0}
                  </p>
                  <p className="text-sm text-slate-500">Total</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-3xl font-heading font-bold text-emerald-600">
                    {dashboardData.network.level_1 || 0}
                  </p>
                  <p className="text-sm text-slate-500">1º Nível</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-heading font-bold text-blue-600">
                    {dashboardData.network.level_2 || 0}
                  </p>
                  <p className="text-sm text-slate-500">2º Nível</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-heading font-bold text-purple-600">
                    {dashboardData.network.level_3 || 0}
                  </p>
                  <p className="text-sm text-slate-500">3º Nível</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Qualification Status */}
        {dashboardData?.qualification && (
          <Card className={dashboardData.qualification.is_qualified ? 'border-emerald-200' : 'border-amber-200'}>
            <CardContent>
              <div className="flex items-center gap-4">
                {dashboardData.qualification.is_qualified ? (
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-heading font-bold text-primary-main">
                    {dashboardData.qualification.is_qualified ? 'Qualificado!' : 'Falta qualificar'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Volume pessoal: {formatCurrency(dashboardData.qualification.current_volume)} / {formatCurrency(dashboardData.qualification.min_required)}
                  </p>
                </div>
                <Badge variant={dashboardData.qualification.is_qualified ? 'success' : 'warning'}>
                  {dashboardData.qualification.is_qualified ? 'Ativo' : 'Pendente'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Link */}
        {user?.referral_code && (
          <Card>
            <CardHeader>
              <CardTitle>Compartilhe seu Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/store?ref=${user.referral_code}`}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-600"
                />
                <Button variant="secondary" size="sm" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
