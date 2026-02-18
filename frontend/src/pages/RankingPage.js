import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard } from '../components/layout/AppLayout';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Trophy, Medal, Award, TrendingUp, Users, 
  DollarSign, Star, Crown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function RankingPage() {
  const { token, user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState('sales');

  useEffect(() => {
    fetchRanking();
  }, [period, metric]);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ranking/resellers?period=${period}&metric=${metric}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRanking(data.ranking);
      }
    } catch (error) {
      toast.error('Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-slate-500 font-bold">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
    if (rank === 2) return 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-300';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
    return 'bg-white';
  };

  const getMetricValue = (item) => {
    switch (metric) {
      case 'sales':
        return formatCurrency(item.total_sales || 0);
      case 'commissions':
        return formatCurrency(item.total_commissions || 0);
      case 'network':
        return `${item.network_size || 0} membros`;
      case 'points':
        return `${item.points || 0} pts`;
      default:
        return '-';
    }
  };

  const periodLabels = {
    week: 'Esta Semana',
    month: 'Este Mês',
    quarter: 'Este Trimestre',
    year: 'Este Ano',
    all: 'Todos os Tempos'
  };

  const metricLabels = {
    sales: 'Vendas',
    commissions: 'Comissões',
    network: 'Tamanho da Rede',
    points: 'Pontos'
  };

  const metricIcons = {
    sales: DollarSign,
    commissions: TrendingUp,
    network: Users,
    points: Star
  };

  const MetricIcon = metricIcons[metric];

  return (
    <AppLayout title="Ranking de Revendedores" subtitle="Veja os melhores desempenhos da rede">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">Período:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">Métrica:</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-main focus:border-brand-main"
            >
              {Object.entries(metricLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Top 3 Podium */}
        {!loading && ranking.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center pt-8 pb-6">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Medal className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 mb-1">2º Lugar</p>
              <h3 className="font-heading font-bold text-slate-900">{ranking[1]?.name}</h3>
              <p className="text-brand-main font-bold mt-2">{getMetricValue(ranking[1])}</p>
            </div>

            {/* 1st Place */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-xl border-2 border-amber-400 shadow-lg text-center pt-6 pb-6 transform scale-105">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <p className="text-sm text-amber-600 mb-1 font-medium">1º Lugar</p>
              <h3 className="font-heading font-bold text-xl text-slate-900">{ranking[0]?.name}</h3>
              <p className="text-brand-main font-bold text-lg mt-2">{getMetricValue(ranking[0])}</p>
            </div>

            {/* 3rd Place */}
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm text-center pt-8 pb-6">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <Medal className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm text-slate-500 mb-1">3º Lugar</p>
              <h3 className="font-heading font-bold text-slate-900">{ranking[2]?.name}</h3>
              <p className="text-brand-main font-bold mt-2">{getMetricValue(ranking[2])}</p>
            </div>
          </div>
        )}

        {/* Full Ranking List */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-heading font-semibold text-slate-900 flex items-center gap-2">
              <MetricIcon className="w-5 h-5 text-brand-main" />
              Ranking por {metricLabels[metric]} - {periodLabels[period]}
            </h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-brand-main border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum dado de ranking disponível</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ranking.map((item, idx) => (
                <div
                  key={item.user_id || idx}
                  className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${getRankBg(idx + 1)} ${
                    item.user_id === user?.user_id ? 'ring-2 ring-brand-main ring-inset' : ''
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    {getRankIcon(idx + 1)}
                  </div>
                  
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    {item.picture ? (
                      <img src={item.picture} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-500 font-bold text-lg">
                        {item.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">
                      {item.name}
                      {item.user_id === user?.user_id && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-brand-main text-white rounded-full">Você</span>
                      )}
                    </h4>
                    <p className="text-sm text-slate-500">{item.email}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-heading font-bold text-lg text-slate-900">
                      {getMetricValue(item)}
                    </p>
                    {metric === 'sales' && item.order_count && (
                      <p className="text-xs text-slate-500">{item.order_count} pedidos</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
