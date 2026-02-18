import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { formatDate, formatDateTime } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Link2, Copy, Share2, MousePointer, ShoppingCart,
  TrendingUp, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function ReferralLinksPage() {
  const { token, user } = useAuth();
  const [linkData, setLinkData] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clicksPage, setClicksPage] = useState(1);
  const [totalClicks, setTotalClicks] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchLinkData();
    fetchClicks();
  }, []);

  useEffect(() => {
    fetchClicks();
  }, [clicksPage]);

  const fetchLinkData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/referral/link`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setLinkData(data);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados do link');
    } finally {
      setLoading(false);
    }
  };

  const fetchClicks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/referral/clicks?page=${clicksPage}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setClicks(data.clicks);
        setTotalClicks(data.total);
      }
    } catch (error) {
      console.error('Error fetching clicks:', error);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const shareLink = async () => {
    if (navigator.share && linkData?.referral_link) {
      try {
        await navigator.share({
          title: 'Vanguard - Loja Online',
          text: 'Confira os melhores produtos na Vanguard!',
          url: linkData.referral_link
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(linkData.referral_link);
        }
      }
    } else {
      copyToClipboard(linkData?.referral_link || '');
    }
  };

  const totalPages = Math.ceil(totalClicks / 10);

  if (loading) {
    return (
      <AppLayout title="Links de Indicação">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-main border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Links de Indicação" subtitle="Compartilhe seu link e ganhe comissões">
      <div className="space-y-6">
        {/* Main Link Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <p className="text-slate-400 text-sm mb-2">Seu Link de Indicação</p>
              <div className="flex items-center gap-2 bg-white/10 rounded-xl p-4 mb-4">
                <code className="flex-1 text-sm font-mono text-white truncate">
                  {linkData?.referral_link}
                </code>
                <button 
                  onClick={() => copyToClipboard(linkData?.referral_link || '')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={shareLink}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-main hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </button>
              </div>
            </div>
            
            <div className="lg:w-64 p-5 bg-white/10 rounded-xl text-center">
              <p className="text-slate-400 text-xs mb-1">Código de Indicação</p>
              <p className="text-3xl font-heading font-bold tracking-wider">
                {linkData?.referral_code}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={MousePointer}
            label="Cliques Totais"
            value={linkData?.stats?.total_clicks || 0}
            color="blue"
          />
          <StatCard
            icon={ShoppingCart}
            label="Conversões"
            value={linkData?.stats?.total_conversions || 0}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Taxa de Conversão"
            value={`${linkData?.stats?.conversion_rate || 0}%`}
            color="amber"
          />
          <StatCard
            icon={MousePointer}
            label="Cliques Este Mês"
            value={linkData?.stats?.monthly_clicks || 0}
            color="purple"
          />
        </div>

        {/* Tips Card */}
        <DashCard title="Dicas para Aumentar suas Conversões" className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              Compartilhe seu link nas redes sociais com uma descrição atrativa
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              Envie para amigos e familiares que podem se interessar pelos produtos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              Use o QR Code em materiais impressos ou cartões de visita
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              O cookie de rastreamento dura 30 dias - a pessoa pode comprar depois!
            </li>
          </ul>
        </DashCard>

        {/* Click History */}
        <DashCard title="Histórico de Cliques" noPadding>
          {clicks.length === 0 ? (
            <div className="text-center py-12">
              <MousePointer className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum clique registrado ainda</p>
              <p className="text-sm text-slate-400 mt-1">
                Compartilhe seu link para começar a rastrear!
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Data/Hora</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Navegador</th>
                      <th className="text-left p-4 font-medium text-slate-600 text-sm">Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clicks.map((click) => (
                      <tr key={click.click_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm text-slate-700">
                          {formatDateTime(click.created_at)}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {click.user_agent?.includes('Mobile') ? 'Mobile' : 'Desktop'}
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {click.ip_address?.substring(0, 10) || '-'}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100">
                  <p className="text-sm text-slate-600">
                    Página {clicksPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setClicksPage(p => Math.max(1, p - 1))}
                      disabled={clicksPage === 1}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setClicksPage(p => Math.min(totalPages, p + 1))}
                      disabled={clicksPage === totalPages}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashCard>
      </div>
    </AppLayout>
  );
}
