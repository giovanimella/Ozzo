import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  BarChart3, TrendingUp, Users, ShoppingBag, Wallet,
  Calendar, Download, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const COLORS = ['#0f172a', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dashboard/admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (error) {
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  // Generate mock chart data based on real data
  const generateChartData = () => {
    const baseValue = dashboardData?.orders_this_month?.total || 0;
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days.map((day, idx) => ({
      name: day,
      vendas: Math.round((baseValue / 7) * (0.5 + Math.random())),
      comissoes: Math.round((baseValue / 7) * 0.2 * (0.5 + Math.random())),
    }));
  };

  const userDistribution = dashboardData?.user_counts ? [
    { name: 'Admin', value: (dashboardData.user_counts.admin_tecnico || 0) + (dashboardData.user_counts.admin_geral || 0) },
    { name: 'Supervisor', value: dashboardData.user_counts.supervisor || 0 },
    { name: 'Líder', value: dashboardData.user_counts.lider || 0 },
    { name: 'Revendedor', value: dashboardData.user_counts.revendedor || 0 },
    { name: 'Cliente', value: dashboardData.user_counts.cliente || 0 },
    { name: 'Embaixador', value: dashboardData.user_counts.embaixador || 0 },
  ].filter(item => item.value > 0) : [];

  const chartData = generateChartData();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="reports-title">
              Relatórios
            </h1>
            <p className="text-slate-600">Análise de desempenho e métricas do sistema</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 px-4 bg-white border border-slate-200 rounded-lg"
            >
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Ano</option>
            </select>
            <Button variant="secondary">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Faturamento</p>
                  <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                    {formatCurrency(dashboardData?.orders_this_month?.total || 0)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-emerald-600 text-sm">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+12% vs mês anterior</span>
                  </div>
                </div>
                <div className="w-12 h-12 gold-gradient rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pedidos</p>
                  <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                    {dashboardData?.orders_this_month?.count || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-emerald-600 text-sm">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+8% vs mês anterior</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Comissões Pagas</p>
                  <p className="text-2xl font-heading font-bold text-primary-main mt-1">
                    {formatCurrency(dashboardData?.commissions?.paid || 0)}
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    {formatCurrency(dashboardData?.commissions?.pending || 0)} pendentes
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
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
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Vendas x Comissões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="vendas" name="Vendas" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comissoes" name="Comissões" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Distribuição de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tendência de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="vendas" 
                    name="Vendas"
                    stroke="#0f172a" 
                    strokeWidth={2}
                    dot={{ fill: '#0f172a', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="comissoes" 
                    name="Comissões"
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary-main text-white">
            <CardContent className="py-6 text-center">
              <p className="text-slate-300 text-sm mb-2">Taxa de Conversão</p>
              <p className="text-4xl font-heading font-bold">4.2%</p>
              <p className="text-slate-300 text-sm mt-2">Visitantes → Compradores</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-600 text-white">
            <CardContent className="py-6 text-center">
              <p className="text-emerald-100 text-sm mb-2">Ticket Médio</p>
              <p className="text-4xl font-heading font-bold">
                {formatCurrency(
                  dashboardData?.orders_this_month?.count 
                    ? (dashboardData.orders_this_month.total / dashboardData.orders_this_month.count)
                    : 0
                )}
              </p>
              <p className="text-emerald-100 text-sm mt-2">Por pedido</p>
            </CardContent>
          </Card>

          <Card className="bg-accent-main text-white">
            <CardContent className="py-6 text-center">
              <p className="text-amber-100 text-sm mb-2">Crescimento da Rede</p>
              <p className="text-4xl font-heading font-bold">+15%</p>
              <p className="text-amber-100 text-sm mt-2">Novos revendedores este mês</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
