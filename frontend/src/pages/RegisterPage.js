import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/layouts/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { toast } from '../components/ui/toast';
import { User, Mail, Lock, Phone, Eye, EyeOff, Hash } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    access_level: 5, // Cliente by default
    sponsor_code: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Pre-fill sponsor code from URL
  React.useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setFormData(prev => ({ ...prev, sponsor_code: ref, access_level: 4 }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = {
        ...formData,
        access_level: parseInt(formData.access_level)
      };
      
      // Only send sponsor_code if registering as reseller
      if (userData.access_level !== 4) {
        delete userData.sponsor_code;
      }

      await register(userData);
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Falha no registro');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthLayout title="Crie sua conta" subtitle="Comece sua jornada de sucesso">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            name="name"
            type="text"
            placeholder="Seu nome completo"
            value={formData.name}
            onChange={handleChange}
            className="pl-12"
            required
            data-testid="register-name"
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            name="email"
            type="email"
            placeholder="Seu email"
            value={formData.email}
            onChange={handleChange}
            className="pl-12"
            required
            data-testid="register-email"
          />
        </div>

        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            name="phone"
            type="tel"
            placeholder="Telefone (opcional)"
            value={formData.phone}
            onChange={handleChange}
            className="pl-12"
            data-testid="register-phone"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Crie uma senha"
            value={formData.password}
            onChange={handleChange}
            className="pl-12 pr-12"
            required
            minLength={6}
            data-testid="register-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Select
          name="access_level"
          value={formData.access_level}
          onChange={handleChange}
          label="Tipo de conta"
          data-testid="register-type"
        >
          <option value={5}>Cliente</option>
          <option value={4}>Revendedor</option>
          <option value={6}>Embaixador</option>
        </Select>

        {parseInt(formData.access_level) === 4 && (
          <div className="relative">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              name="sponsor_code"
              type="text"
              placeholder="Código do patrocinador"
              value={formData.sponsor_code}
              onChange={handleChange}
              className="pl-12 uppercase"
              required
              data-testid="register-sponsor"
            />
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" data-testid="register-submit">
          Criar Conta
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-500">ou continue com</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleGoogleRegister}
          data-testid="google-register"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Já tem uma conta?{' '}
        <Link to="/login" className="font-medium text-primary-main hover:underline" data-testid="login-link">
          Entre aqui
        </Link>
      </p>
    </AuthLayout>
  );
}
