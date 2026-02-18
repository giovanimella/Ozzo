import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  TrendingUp, Users, ShoppingBag, Wallet, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

  const generateChartData = () => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return days.map((day) => ({
      name: day,
      vendas: Math.floor(Math.random() * 5000) + 1000,
      comissoes: Math.floor(Math.random() * 500) + 100,
    }));
  };

  const chartData = generateChartData();

  const userDistribution = [
    { name: 'Admin', value: dashboardData?.total_admins || 1 },
    { name: 'Revendedor', value: dashboardData?.active_resellers || 10 },
    { name: 'Cliente', value: dashboardData?.total_clients || 50 },
  ];

  if (loading) {
    return (
      <AppLayout title="Relatórios">
        <div className="flex items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-brand-main border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Relatórios" subtitle="Análise de desempenho e métricas do sistema">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-main"
            >
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Ano</option>
            </select>
          </div>
          
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  window.open(`${API_URL}/api/export/${e.target.value}?format=csv`, '_blank');
                  e.target.value = '';
                }
              }}
              className="h-10 px-4 pr-10 bg-brand-main text-white border-0 rounded-lg text-sm font-medium cursor-pointer appearance-none"
              defaultValue=""
            >
              <option value="" disabled>Exportar...</option>
              <option value="sales">Relatório de Vendas</option>
              <option value="commissions">Relatório de Comissões</option>
              <option value="users">Relatório de Usuários</option>
            </select>
            <Download className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={TrendingUp}
            label="Faturamento"
            value={formatCurrency(dashboardData?.orders_this_month?.total || 0)}
            trend="+12% vs mês anterior"
            trendUp={true}
            color="blue"
          />
          <StatCard
            icon={ShoppingBag}
            label="Pedidos"
            value={dashboardData?.orders_this_month?.count || 0}
            trend="+8% vs mês anterior"
            trendUp={true}
            color="green"
          />
          <StatCard
            icon={Wallet}
            label="Comissões Pagas"
            value={formatCurrency(dashboardData?.commissions?.paid || 0)}
            trend={`${formatCurrency(dashboardData?.commissions?.pending || 0)} pendentes`}
            color="amber"
          />
          <StatCard
            icon={Users}
            label="Revendedores Ativos"
            value={dashboardData?.active_resellers || 0}
            trend={`${dashboardData?.suspended_resellers || 0} suspensos`}
            color="purple"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <DashCard title="Vendas x Comissões">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="vendas" name="Vendas" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="comissoes" name="Comissões" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashCard>

          {/* User Distribution */}
          <DashCard title="Distribuição de Usuários">
            <div className="h-72 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {userDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 pr-4">
                {userDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                    <span className="text-sm font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </DashCard>
        </div>

        {/* Trend Chart */}
        <DashCard title="Tendência de Vendas">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVendasReport" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  fill="url(#colorVendasReport)"
                  name="Vendas"
                />
                <Line 
                  type="monotone" 
                  dataKey="comissoes" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#10b981' }}
                  name="Comissões"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashCard>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 text-white rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm mb-2">Taxa de Conversão</p>
            <p className="text-4xl font-heading font-bold">4.2%</p>
            <p className="text-slate-400 text-sm mt-2">Visitantes → Compradores</p>
          </div>

          <div className="bg-emerald-600 text-white rounded-xl p-6 text-center">
            <p className="text-emerald-100 text-sm mb-2">Ticket Médio</p>
            <p className="text-4xl font-heading font-bold">
              {formatCurrency(
                dashboardData?.orders_this_month?.count 
                  ? (dashboardData.orders_this_month.total / dashboardData.orders_this_month.count)
                  : 0
              )}
            </p>
            <p className="text-emerald-100 text-sm mt-2">Por pedido</p>
          </div>

          <div className="bg-amber-500 text-white rounded-xl p-6 text-center">
            <p className="text-amber-100 text-sm mb-2">Comissão Média</p>
            <p className="text-4xl font-heading font-bold">8.5%</p>
            <p className="text-amber-100 text-sm mt-2">Por venda da rede</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
