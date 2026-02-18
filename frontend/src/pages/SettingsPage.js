import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/toast';
import { Save, Eye, EyeOff, AlertTriangle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        toast.success('Configurações salvas!');
      } else {
        toast.error('Erro ao salvar');
      }
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="settings-title">
              Configurações
            </h1>
            <p className="text-slate-600">Configurações gerais do sistema</p>
          </div>
          <Button onClick={handleSave} loading={saving} data-testid="save-settings-btn">
            <Save className="w-4 h-4" />
            Salvar Alterações
          </Button>
        </div>

        {/* Commission Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Comissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="1º Nível (%)"
                type="number"
                value={settings?.commission_level_1 || 10}
                onChange={(e) => updateSetting('commission_level_1', parseFloat(e.target.value))}
              />
              <Input
                label="2º Nível (%)"
                type="number"
                value={settings?.commission_level_2 || 5}
                onChange={(e) => updateSetting('commission_level_2', parseFloat(e.target.value))}
              />
              <Input
                label="3º Nível (%)"
                type="number"
                value={settings?.commission_level_3 || 5}
                onChange={(e) => updateSetting('commission_level_3', parseFloat(e.target.value))}
              />
            </div>
            <Input
              label="Comissão Cliente Indicador (%)"
              type="number"
              value={settings?.client_referral_commission || 5}
              onChange={(e) => updateSetting('client_referral_commission', parseFloat(e.target.value))}
            />
            <Input
              label="Dias de Bloqueio do Bônus"
              type="number"
              value={settings?.bonus_block_days || 7}
              onChange={(e) => updateSetting('bonus_block_days', parseInt(e.target.value))}
            />
          </CardContent>
        </Card>

        {/* Qualification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Qualificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Volume Mínimo Mensal (R$)"
              type="number"
              value={settings?.min_qualification_amount || 100}
              onChange={(e) => updateSetting('min_qualification_amount', parseFloat(e.target.value))}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Meses para Suspensão"
                type="number"
                value={settings?.inactive_months_suspend || 6}
                onChange={(e) => updateSetting('inactive_months_suspend', parseInt(e.target.value))}
              />
              <Input
                label="Meses para Cancelamento"
                type="number"
                value={settings?.inactive_months_cancel || 12}
                onChange={(e) => updateSetting('inactive_months_cancel', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Saques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Valor Mínimo (R$)"
                type="number"
                value={settings?.min_withdrawal_amount || 50}
                onChange={(e) => updateSetting('min_withdrawal_amount', parseFloat(e.target.value))}
              />
              <Input
                label="Taxa (%)"
                type="number"
                value={settings?.withdrawal_fee_percent || 5}
                onChange={(e) => updateSetting('withdrawal_fee_percent', parseFloat(e.target.value))}
              />
              <Input
                label="Prazo (dias)"
                type="number"
                value={settings?.withdrawal_processing_days || 3}
                onChange={(e) => updateSetting('withdrawal_processing_days', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Integrações de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PagSeguro */}
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-heading font-bold">PagSeguro</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.pagseguro_enabled || false}
                    onChange={(e) => updateSetting('pagseguro_enabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Ativo</span>
                </label>
              </div>
              <div className="space-y-3">
                <Input
                  label="Email"
                  type="email"
                  value={settings?.pagseguro_email || ''}
                  onChange={(e) => updateSetting('pagseguro_email', e.target.value)}
                  placeholder="seu@email.com"
                />
                <div className="relative">
                  <Input
                    label="Token"
                    type={showApiKeys.pagseguro ? 'text' : 'password'}
                    value={settings?.pagseguro_token || ''}
                    onChange={(e) => updateSetting('pagseguro_token', e.target.value)}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeys(prev => ({ ...prev, pagseguro: !prev.pagseguro }))}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKeys.pagseguro ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.pagseguro_sandbox || true}
                    onChange={(e) => updateSetting('pagseguro_sandbox', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-600">Modo Sandbox (teste)</span>
                </label>
              </div>
            </div>

            {/* MercadoPago */}
            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-heading font-bold">MercadoPago</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.mercadopago_enabled || false}
                    onChange={(e) => updateSetting('mercadopago_enabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Ativo</span>
                </label>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    label="Access Token"
                    type={showApiKeys.mercadopago ? 'text' : 'password'}
                    value={settings?.mercadopago_access_token || ''}
                    onChange={(e) => updateSetting('mercadopago_access_token', e.target.value)}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeys(prev => ({ ...prev, mercadopago: !prev.mercadopago }))}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKeys.mercadopago ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.mercadopago_sandbox || true}
                    onChange={(e) => updateSetting('mercadopago_sandbox', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-600">Modo Sandbox (teste)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Email (Resend)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Envio de emails ativo</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.resend_enabled || false}
                  onChange={(e) => updateSetting('resend_enabled', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
            </div>
            <div className="relative">
              <Input
                label="API Key"
                type={showApiKeys.resend ? 'text' : 'password'}
                value={settings?.resend_api_key || ''}
                onChange={(e) => updateSetting('resend_api_key', e.target.value)}
                placeholder="re_••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowApiKeys(prev => ({ ...prev, resend: !prev.resend }))}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showApiKeys.resend ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input
              label="Email Remetente"
              type="email"
              value={settings?.sender_email || 'onboarding@resend.dev'}
              onChange={(e) => updateSetting('sender_email', e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Other Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Outras Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              label="Dias do Cookie de Rastreio"
              type="number"
              value={settings?.tracking_cookie_days || 30}
              onChange={(e) => updateSetting('tracking_cookie_days', parseInt(e.target.value))}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} loading={saving} size="lg">
            <Save className="w-4 h-4" />
            Salvar Todas as Alterações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
