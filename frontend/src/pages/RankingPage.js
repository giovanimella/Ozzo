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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main flex items-center gap-2" data-testid="ranking-title">
              <Trophy className="w-7 h-7 text-accent-main" />
              Ranking de Revendedores
            </h1>
            <p className="text-slate-600">Veja os melhores desempenhos da rede</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Período:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 px-4 bg-white border border-slate-200 rounded-lg"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Métrica:</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="h-10 px-4 bg-white border border-slate-200 rounded-lg"
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
            <Card className="text-center pt-8 pb-6 border-2 border-slate-200">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Medal className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 mb-1">2º Lugar</p>
              <h3 className="font-heading font-bold text-primary-main">{ranking[1]?.name}</h3>
              <p className="text-accent-main font-bold mt-2">{getMetricValue(ranking[1])}</p>
            </Card>

            {/* 1st Place */}
            <Card className="text-center pt-6 pb-6 border-2 border-yellow-400 bg-gradient-to-b from-yellow-50 to-white transform scale-105 shadow-lg">
              <div className="w-20 h-20 mx-auto gold-gradient rounded-full flex items-center justify-center mb-3 shadow-lg">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <p className="text-sm text-yellow-600 mb-1 font-medium">1º Lugar</p>
              <h3 className="font-heading font-bold text-xl text-primary-main">{ranking[0]?.name}</h3>
              <p className="text-accent-main font-bold text-lg mt-2">{getMetricValue(ranking[0])}</p>
            </Card>

            {/* 3rd Place */}
            <Card className="text-center pt-8 pb-6 border-2 border-amber-200">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <Medal className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm text-slate-500 mb-1">3º Lugar</p>
              <h3 className="font-heading font-bold text-primary-main">{ranking[2]?.name}</h3>
              <p className="text-accent-main font-bold mt-2">{getMetricValue(ranking[2])}</p>
            </Card>
          </div>
        )}

        {/* Full Ranking List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MetricIcon className="w-5 h-5" />
              Ranking por {metricLabels[metric]} - {periodLabels[period]}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
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
                    className={`flex items-center gap-4 p-4 ${getRankBg(idx + 1)} ${
                      item.user_id === user?.user_id ? 'ring-2 ring-primary-main ring-inset' : ''
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
                      <h4 className="font-medium text-primary-main truncate">
                        {item.name}
                        {item.user_id === user?.user_id && (
                          <Badge variant="primary" className="ml-2">Você</Badge>
                        )}
                      </h4>
                      <p className="text-sm text-slate-500">{item.email}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-heading font-bold text-lg text-primary-main">
                        {getMetricValue(item)}
                      </p>
                      {metric === 'sales' && item.order_count && (
                        <p className="text-xs text-slate-500">{item.order_count} pedidos</p>
                      )}
                      {metric === 'commissions' && item.commission_count && (
                        <p className="text-xs text-slate-500">{item.commission_count} comissões</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
