import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  isPushSupported, 
  getNotificationPermission, 
  subscribeToPush, 
  unsubscribeFromPush,
  getSubscriptionStatus
} from '../../services/pushNotifications';
import { Bell, BellOff, Check, X, Loader2, Smartphone } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { toast } from '../ui/toast';

export default function NotificationSettings({ className }) {
  const { token } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    
    const isSupported = isPushSupported();
    setSupported(isSupported);
    
    if (isSupported) {
      setPermission(getNotificationPermission());
      const status = await getSubscriptionStatus();
      setSubscribed(status.subscribed);
    }
    
    setLoading(false);
  };

  const handleToggle = async () => {
    if (!supported) {
      toast.error('Notificações não são suportadas neste navegador');
      return;
    }

    setToggling(true);

    try {
      if (subscribed) {
        await unsubscribeFromPush(token);
        setSubscribed(false);
        toast.success('Notificações desativadas');
      } else {
        const result = await subscribeToPush(token);
        if (result.success) {
          setSubscribed(true);
          setPermission('granted');
          toast.success('Notificações ativadas!');
        }
      }
    } catch (error) {
      if (error.message.includes('denied')) {
        toast.error('Permissão negada. Habilite nas configurações do navegador.');
      } else {
        toast.error(error.message || 'Erro ao configurar notificações');
      }
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-3 p-4 bg-slate-50 rounded-xl", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Carregando...</span>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className={cn("flex items-center gap-3 p-4 bg-amber-50 rounded-xl", className)}>
        <BellOff className="w-5 h-5 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Notificações não suportadas</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Use o Chrome, Firefox ou Safari em dispositivo compatível
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 bg-white border border-slate-200 rounded-xl", className)}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          subscribed ? "bg-emerald-50" : "bg-slate-100"
        )}>
          {subscribed ? (
            <Bell className="w-6 h-6 text-emerald-600" />
          ) : (
            <BellOff className="w-6 h-6 text-slate-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900">Notificações Push</h4>
            {subscribed && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                Ativo
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {subscribed 
              ? 'Você receberá notificações sobre novas comissões e atualizações importantes.'
              : 'Ative para receber alertas de comissões, pedidos e novidades.'}
          </p>
          
          {permission === 'denied' && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
              <X className="w-3 h-3" />
              <span>Permissão bloqueada. Altere nas configurações do navegador.</span>
            </div>
          )}
        </div>
        
        <Button
          variant={subscribed ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={toggling || permission === 'denied'}
          className="flex-shrink-0"
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : subscribed ? (
            'Desativar'
          ) : (
            'Ativar'
          )}
        </Button>
      </div>

      {/* PWA Install Hint */}
      {!window.matchMedia('(display-mode: standalone)').matches && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 text-sm">
            <Smartphone className="w-4 h-4 text-brand-main flex-shrink-0" />
            <p className="text-slate-600">
              <span className="font-medium text-brand-main">Dica:</span> Instale o app na tela inicial para uma experiência melhor. 
              Toque em <span className="font-medium">"Compartilhar"</span> e depois <span className="font-medium">"Adicionar à Tela Inicial"</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
