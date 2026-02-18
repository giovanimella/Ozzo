import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { DashCard } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import { 
  UserPlus, Copy, Share2, Mail, MessageCircle, 
  Link as LinkIcon, QrCode, Check, Users, Gift,
  Smartphone, Send, ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function InvitePage() {
  const { user, token } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate invite link with sponsor code
  const inviteLink = `${window.location.origin}/register?sponsor=${user?.referral_code}&type=reseller`;
  const inviteCode = user?.referral_code;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Código copiado!');
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Quero te convidar para ser revendedor(a) na Vanguard MLM! 🚀\n\n` +
      `💰 Ganhe comissões de até 3 níveis da sua rede\n` +
      `📦 Produtos de qualidade com preços especiais\n` +
      `📊 Dashboard completo para acompanhar seus ganhos\n\n` +
      `Use meu código de indicação: ${inviteCode}\n\n` +
      `Clique aqui para se cadastrar:\n${inviteLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaTelegram = () => {
    const message = encodeURIComponent(
      `Olá! Quero te convidar para ser revendedor(a) na Vanguard MLM!\n\n` +
      `Use meu código: ${inviteCode}\n\n` +
      `Cadastre-se: ${inviteLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${message}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Convite para ser Revendedor(a) - Vanguard MLM');
    const body = encodeURIComponent(
      `Olá!\n\n` +
      `Quero te convidar para fazer parte da minha equipe na Vanguard MLM!\n\n` +
      `Benefícios:\n` +
      `• Comissões de até 3 níveis da sua rede (10%, 5%, 5%)\n` +
      `• Produtos de qualidade com preços especiais\n` +
      `• Sistema completo para gerenciar suas vendas e comissões\n\n` +
      `Use meu código de indicação: ${inviteCode}\n\n` +
      `Clique no link abaixo para se cadastrar:\n${inviteLink}\n\n` +
      `Abraços,\n${user?.name}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Seja um Revendedor Vanguard',
          text: `Use meu código ${inviteCode} para se cadastrar como revendedor na Vanguard MLM!`,
          url: inviteLink
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  const sendDirectInvite = async (e) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast.error('Preencha o nome e email');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/invites/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email, 
          name,
          type: 'reseller'
        })
      });

      if (res.ok) {
        toast.success(`Convite enviado para ${name}!`);
        setEmail('');
        setName('');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Erro ao enviar convite');
      }
    } catch (error) {
      toast.error('Erro ao enviar convite');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout title="Convidar Revendedor" showBack>
      <div className="space-y-4 lg:space-y-6 max-w-2xl mx-auto">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-brand-main to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Convide e Ganhe!</h2>
              <p className="text-white/80 text-sm">
                Cada revendedor que você convidar entra na sua rede. 
                Ganhe comissões de até 3 níveis das vendas deles!
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">10%</p>
              <p className="text-xs text-white/70">1º Nível</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">5%</p>
              <p className="text-xs text-white/70">2º Nível</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">5%</p>
              <p className="text-xs text-white/70">3º Nível</p>
            </div>
          </div>
        </div>

        {/* Your Invite Code */}
        <DashCard title="Seu Código de Convite" icon={Gift}>
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex-1">
              <p className="text-sm text-slate-500 mb-1">Código único</p>
              <p className="text-2xl font-mono font-bold text-amber-600 tracking-wider">
                {inviteCode}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={copyCode} className="gap-2">
              <Copy className="w-4 h-4" />
              Copiar
            </Button>
          </div>
        </DashCard>

        {/* Your Invite Link */}
        <DashCard title="Link de Convite" icon={LinkIcon}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <LinkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-sm text-slate-600 truncate flex-1 font-mono">
                {inviteLink}
              </p>
            </div>
            
            <Button 
              onClick={copyLink} 
              className="w-full gap-2"
              variant={copied ? 'success' : 'default'}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Link de Convite
                </>
              )}
            </Button>
          </div>
        </DashCard>

        {/* Share Options */}
        <DashCard title="Compartilhar Via" icon={Share2}>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={shareViaWhatsApp}
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">WhatsApp</p>
                <p className="text-xs text-slate-500">Enviar mensagem</p>
              </div>
            </button>
            
            <button
              onClick={shareViaTelegram}
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">Telegram</p>
                <p className="text-xs text-slate-500">Compartilhar</p>
              </div>
            </button>
            
            <button
              onClick={shareViaEmail}
              className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">Email</p>
                <p className="text-xs text-slate-500">Enviar convite</p>
              </div>
            </button>
            
            <button
              onClick={shareNative}
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">Mais Opções</p>
                <p className="text-xs text-slate-500">Compartilhar</p>
              </div>
            </button>
          </div>
        </DashCard>

        {/* Direct Invite Form */}
        <DashCard title="Enviar Convite Direto" icon={Mail}>
          <form onSubmit={sendDirectInvite} className="space-y-4">
            <p className="text-sm text-slate-500">
              Envie um convite personalizado por email diretamente para a pessoa que você quer convidar.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nome"
                placeholder="Nome da pessoa"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full gap-2" 
              disabled={sending || !email || !name}
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Convite
                </>
              )}
            </Button>
          </form>
        </DashCard>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Dicas para Convidar
          </h4>
          <ul className="text-sm text-blue-700 space-y-1.5">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Explique os benefícios: comissões, preços especiais e suporte</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Compartilhe seus resultados para mostrar que funciona</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Ofereça ajuda no início para a pessoa ter sucesso</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Use seu link de convite para garantir que entrem na sua rede</span>
            </li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
