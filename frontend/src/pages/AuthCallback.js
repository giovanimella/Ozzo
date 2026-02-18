import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../components/ui/toast';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { handleGoogleSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        toast.error('Sessão inválida');
        navigate('/login');
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const user = await handleGoogleSession(sessionId);
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard', { state: { user } });
      } catch (error) {
        toast.error('Falha na autenticação');
        navigate('/login');
      }
    };

    processSession();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary-main spinner mx-auto mb-4" />
        <p className="text-slate-600">Autenticando...</p>
      </div>
    </div>
  );
}
