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
        <div>
          <h1 className="font-heading font-bold text-2xl text-primary-main flex items-center gap-2" data-testid="referral-links-title">
            <Link2 className="w-7 h-7 text-accent-main" />
            Links de Indicação
          </h1>
          <p className="text-slate-600">Compartilhe seu link e ganhe comissões</p>
        </div>

        {/* Main Link Card */}
        <Card className="bg-gradient-to-br from-primary-main to-slate-800 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <p className="text-slate-300 text-sm mb-2">Seu Link de Indicação</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 mb-4">
                  <code className="flex-1 text-sm font-mono text-white truncate">
                    {linkData?.referral_link}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(linkData?.referral_link || '')}
                    className="text-white hover:bg-white/20"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={shareLink}>
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </Button>
                </div>
              </div>
              
              <div className="lg:w-64 p-4 bg-white/10 rounded-xl">
                <p className="text-slate-300 text-xs mb-1">Código de Indicação</p>
                <p className="text-3xl font-heading font-bold tracking-wider">
                  {linkData?.referral_code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <MousePointer className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-primary-main">
                {linkData?.stats?.total_clicks || 0}
              </p>
              <p className="text-sm text-slate-500">Cliques Totais</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-primary-main">
                {linkData?.stats?.total_conversions || 0}
              </p>
              <p className="text-sm text-slate-500">Conversões</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-primary-main">
                {linkData?.stats?.conversion_rate || 0}%
              </p>
              <p className="text-sm text-slate-500">Taxa de Conversão</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                <MousePointer className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-primary-main">
                {linkData?.stats?.monthly_clicks || 0}
              </p>
              <p className="text-sm text-slate-500">Cliques Este Mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Tips Card */}
        <Card className="bg-gradient-to-r from-accent-light/30 to-amber-50 border-accent-main/30">
          <CardContent className="p-5">
            <h3 className="font-heading font-bold text-primary-main mb-3">
              Dicas para Aumentar suas Conversões
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-accent-main">•</span>
                Compartilhe seu link nas redes sociais com uma descrição atrativa
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-main">•</span>
                Envie para amigos e familiares que podem se interessar pelos produtos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-main">•</span>
                Use o QR Code em materiais impressos ou cartões de visita
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-main">•</span>
                O cookie de rastreamento dura 30 dias - a pessoa pode comprar depois!
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Click History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="w-5 h-5" />
              Histórico de Cliques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                      <tr className="border-b border-slate-100">
                        <th className="text-left p-4 font-medium text-slate-600">Data/Hora</th>
                        <th className="text-left p-4 font-medium text-slate-600">Navegador</th>
                        <th className="text-left p-4 font-medium text-slate-600">Local</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clicks.map((click) => (
                        <tr key={click.click_id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="p-4 text-sm">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setClicksPage(p => Math.max(1, p - 1))}
                        disabled={clicksPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setClicksPage(p => Math.min(totalPages, p + 1))}
                        disabled={clicksPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
