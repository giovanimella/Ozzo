import React, { useState } from 'react';
import { useAuth, ACCESS_LEVELS } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { toast } from '../components/ui/toast';
import { User, Mail, Phone, CreditCard, MapPin, Save, Copy } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    address: user?.address || {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip: ''
    },
    bank_info: user?.bank_info || {
      bank: '',
      agency: '',
      account: '',
      account_type: 'corrente',
      pix_key: ''
    }
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const updated = await res.json();
        updateUser(updated);
        toast.success('Perfil atualizado!');
      } else {
        toast.error('Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user?.referral_code || '');
    toast.success('Código copiado!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="profile-title">
              Meu Perfil
            </h1>
            <p className="text-slate-600">Gerencie suas informações pessoais</p>
          </div>
          <Button onClick={handleSave} loading={saving} data-testid="save-profile-btn">
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-primary-main text-white flex items-center justify-center text-2xl font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-heading font-bold text-primary-main">{user?.name}</p>
                <p className="text-slate-500">{user?.email}</p>
                <Badge variant="info" className="mt-1">
                  {ACCESS_LEVELS[user?.access_level]?.name || 'Usuário'}
                </Badge>
              </div>
            </div>

            {user?.referral_code && (
              <div className="flex items-center gap-2 p-3 bg-accent-light/10 rounded-lg">
                <span className="text-sm text-slate-600">Código de Indicação:</span>
                <span className="font-mono font-bold text-accent-main">{user.referral_code}</span>
                <button onClick={copyReferralCode} className="ml-auto text-slate-400 hover:text-slate-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="Telefone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
              <Input
                label="CPF"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="CEP"
                value={formData.address?.zip || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, zip: e.target.value }
                }))}
                placeholder="00000-000"
              />
              <div className="md:col-span-2">
                <Input
                  label="Rua"
                  value={formData.address?.street || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, street: e.target.value }
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Número"
                value={formData.address?.number || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, number: e.target.value }
                }))}
              />
              <Input
                label="Complemento"
                value={formData.address?.complement || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, complement: e.target.value }
                }))}
              />
              <Input
                label="Bairro"
                value={formData.address?.neighborhood || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, neighborhood: e.target.value }
                }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Cidade"
                  value={formData.address?.city || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: e.target.value }
                  }))}
                />
                <Input
                  label="UF"
                  value={formData.address?.state || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, state: e.target.value }
                  }))}
                  maxLength={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Dados Bancários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
              Necessário para receber seus saques. Certifique-se de que os dados estão corretos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Banco"
                value={formData.bank_info?.bank || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  bank_info: { ...prev.bank_info, bank: e.target.value }
                }))}
                placeholder="Nome ou código do banco"
              />
              <Input
                label="Agência"
                value={formData.bank_info?.agency || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  bank_info: { ...prev.bank_info, agency: e.target.value }
                }))}
              />
              <Input
                label="Conta"
                value={formData.bank_info?.account || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  bank_info: { ...prev.bank_info, account: e.target.value }
                }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Conta</label>
                <select
                  value={formData.bank_info?.account_type || 'corrente'}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    bank_info: { ...prev.bank_info, account_type: e.target.value }
                  }))}
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="corrente">Conta Corrente</option>
                  <option value="poupanca">Conta Poupança</option>
                </select>
              </div>
              <Input
                label="Chave PIX (opcional)"
                value={formData.bank_info?.pix_key || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  bank_info: { ...prev.bank_info, pix_key: e.target.value }
                }))}
                placeholder="CPF, Email, Telefone ou Chave Aleatória"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} loading={saving} size="lg">
            <Save className="w-4 h-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
