import React, { useState, useEffect } from 'react';
import { useAuth, ACCESS_LEVELS } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard, ProgressCard } from '../components/layout/AppLayout';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  Users, TrendingUp, Wallet, ShoppingBag, 
  ArrowUpRight, Copy, ExternalLink, Target,
  Calendar, Trophy, Clock, Package, DollarSign,
  BarChart3, PieChart, Activity, Zap
} from 'lucide-react';
import { toast } from '../components/ui/toast';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { user, token, accessLevel } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Mock data for charts
  const salesData = [
    { name: 'Seg', vendas: 1200, comissoes: 120 },
    { name: 'Ter', vendas: 1800, comissoes: 180 },
    { name: 'Qua', vendas: 1400, comissoes: 140 },
    { name: 'Qui', vendas: 2200, comissoes: 220 },
    { name: 'Sex', vendas: 1900, comissoes: 190 },
    { name: 'Sáb', vendas: 2800, comissoes: 280 },
    { name: 'Dom', vendas: 1600, comissoes: 160 },
  ];

  const networkData = [
    { name: 'Admin', value: dashboardData?.users?.admin || 1, color: '#2563eb' },
    { name: 'Supervisor', value: dashboardData?.users?.supervisor || 2, color: '#10b981' },
    { name: 'Líder', value: dashboardData?.users?.leader || 5, color: '#f59e0b' },
    { name: 'Revendedor', value: dashboardData?.users?.reseller || 15, color: '#8b5cf6' },
    { name: 'Cliente', value: dashboardData?.users?.client || 50, color: '#64748b' },
  ];

  const recentActivities = [
    { icon: ShoppingBag, text: 'Novo pedido recebido', time: '2 min atrás', color: 'blue' },
    { icon: Users, text: 'Novo revendedor cadastrado', time: '15 min atrás', color: 'green' },
    { icon: DollarSign, text: 'Comissão liberada', time: '1 hora atrás', color: 'amber' },
    { icon: Trophy, text: 'Meta atingida!', time: '3 horas atrás', color: 'purple' },
  ];

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-brand-main border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isAdmin = accessLevel <= 1;

  return (
    <AppLayout 
      title={`Olá, ${user?.name?.split(' ')[0]}!`} 
      subtitle={isAdmin ? 'Visão geral do sistema' : 'Acompanhe seu desempenho'}
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isAdmin ? (
            <>
              <StatCard
                icon={DollarSign}
                label="Faturamento Mensal"
                value={formatCurrency(dashboardData?.revenue?.total || 0)}
                trend="+12% vs mês anterior"
                trendUp={true}
                color="blue"
              />
              <StatCard
                icon={ShoppingBag}
                label="Pedidos Este Mês"
                value={dashboardData?.orders?.count || 0}
                trend="+8% vs mês anterior"
                trendUp={true}
                color="green"
              />
              <StatCard
                icon={Users}
                label="Revendedores Ativos"
                value={dashboardData?.users?.active || 0}
                trend="+5 novos"
                trendUp={true}
                color="purple"
              />
              <StatCard
                icon={Wallet}
                label="Comissões Pendentes"
                value={formatCurrency(dashboardData?.commissions?.pending || 0)}
                color="amber"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={Wallet}
                label="Saldo Disponível"
                value={formatCurrency(user?.available_balance || 0)}
                color="green"
              />
              <StatCard
                icon={Clock}
                label="Saldo Bloqueado"
                value={formatCurrency(user?.blocked_balance || 0)}
                color="amber"
              />
              <StatCard
                icon={TrendingUp}
                label="Comissões do Mês"
                value={formatCurrency(dashboardData?.commissions?.this_month || 0)}
                trend="+18% vs mês anterior"
                trendUp={true}
                color="blue"
              />
              <StatCard
                icon={Users}
                label="Minha Rede"
                value={dashboardData?.network?.total || 0}
                trend="+3 novos"
                trendUp={true}
                color="purple"
              />
            </>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart - Takes 2 columns */}
          <DashCard 
            title="Vendas x Comissões"
            subtitle="Últimos 7 dias"
            className="lg:col-span-2"
            action={
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <option>Esta Semana</option>
                <option>Este Mês</option>
                <option>Este Ano</option>
              </select>
            }
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    fill="url(#colorVendas)" 
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

          {/* Right Column - Calendar + Activities */}
          <div className="space-y-6">
            {/* Mini Calendar Card */}
            <DashCard title="Calendário" noPadding>
              <div className="p-4">
                <div className="text-center mb-4">
                  <h4 className="font-heading font-bold text-lg text-slate-900">
                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h4>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-slate-400 font-medium py-2">{day}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i - new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() + 1;
                    const isToday = day === new Date().getDate() && 
                                    selectedDate.getMonth() === new Date().getMonth();
                    const isValid = day > 0 && day <= new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                    
                    return (
                      <div 
                        key={i}
                        className={`py-2 rounded-lg text-sm cursor-pointer transition-colors
                          ${!isValid ? 'text-transparent' : ''}
                          ${isToday ? 'bg-brand-main text-white font-bold' : 'hover:bg-slate-100'}
                        `}
                      >
                        {isValid ? day : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </DashCard>

            {/* Recent Activity */}
            <DashCard title="Atividade Recente" noPadding>
              <div className="divide-y divide-slate-100">
                {recentActivities.map((activity, idx) => {
                  const colors = {
                    blue: 'bg-blue-50 text-blue-600',
                    green: 'bg-emerald-50 text-emerald-600',
                    amber: 'bg-amber-50 text-amber-600',
                    purple: 'bg-purple-50 text-purple-600',
                  };
                  
                  return (
                    <div key={idx} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[activity.color]}`}>
                        <activity.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{activity.text}</p>
                        <p className="text-xs text-slate-400">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DashCard>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Distribution */}
          <DashCard title="Distribuição da Rede">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={networkData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {networkData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {networkData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </DashCard>

          {/* Goals Progress */}
          <DashCard 
            title="Progresso das Metas"
            action={<a href="/goals" className="text-sm text-brand-main hover:underline">Ver todas</a>}
          >
            <div className="space-y-4">
              <ProgressCard title="Meta de Vendas" current={7500} target={10000} color="blue" />
              <ProgressCard title="Novos Clientes" current={12} target={20} color="green" />
              <ProgressCard title="Volume Pessoal" current={850} target={1000} color="amber" />
            </div>
          </DashCard>

          {/* Referral Link Card */}
          {!isAdmin && (
            <DashCard title="Seu Link de Indicação" className="bg-gradient-to-br from-brand-main to-blue-700">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <p className="text-blue-100 text-sm mb-2">Compartilhe e ganhe comissões</p>
                <div className="bg-white/10 rounded-xl p-3 mb-4">
                  <code className="text-white text-sm font-mono">{user?.referral_code}</code>
                </div>
                <button
                  onClick={copyReferralLink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-brand-main rounded-xl font-medium hover:bg-blue-50 transition-colors"
                  data-testid="copy-referral-btn"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Link
                </button>
              </div>
            </DashCard>
          )}

          {/* Top Performers (Admin) */}
          {isAdmin && (
            <DashCard 
              title="Top Revendedores"
              action={<a href="/ranking" className="text-sm text-brand-main hover:underline">Ver ranking</a>}
              noPadding
            >
              <div className="divide-y divide-slate-100">
                {(dashboardData?.top_resellers || []).slice(0, 5).map((reseller, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                        idx === 1 ? 'bg-slate-100 text-slate-600' : 
                        idx === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-500'}
                    `}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{reseller.name}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(reseller.total_sales || 0)}
                    </span>
                  </div>
                ))}
                {(!dashboardData?.top_resellers || dashboardData.top_resellers.length === 0) && (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </DashCard>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
