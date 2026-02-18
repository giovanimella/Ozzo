import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { Users, ChevronRight, ChevronDown, User, TrendingUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function NetworkNode({ node, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      <div 
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer
          ${level === 0 ? 'bg-primary-main text-white' : 'bg-white border border-slate-200 hover:border-slate-300'}`}
        onClick={() => setExpanded(!expanded)}
        style={{ marginLeft: level * 24 }}
      >
        {hasChildren && (
          <span className="text-slate-400">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        )}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${level === 0 ? 'bg-white/20' : 'bg-primary-main text-white'}`}>
          {node.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${level === 0 ? 'text-white' : 'text-primary-main'}`}>
            {node.name}
          </p>
          <p className={`text-xs truncate ${level === 0 ? 'text-slate-300' : 'text-slate-500'}`}>
            {node.email}
          </p>
        </div>
        <div className="text-right">
          <Badge variant={node.status === 'active' ? 'success' : 'warning'}>
            {node.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
          <p className={`text-xs mt-1 ${level === 0 ? 'text-slate-300' : 'text-slate-500'}`}>
            Nível {level + 1}
          </p>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-2 space-y-2 relative">
          {/* Connector line */}
          <div 
            className="absolute left-6 top-0 w-px bg-slate-200"
            style={{ height: 'calc(100% - 20px)', marginLeft: level * 24 }}
          />
          {node.children.map((child) => (
            <NetworkNode key={child.user_id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkPage() {
  const { token } = useAuth();
  const [tree, setTree] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    try {
      const [treeRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/network/tree`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/network/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (treeRes.ok) {
        const data = await treeRes.json();
        setTree(data.tree || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      toast.error('Erro ao carregar rede');
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="network-title">
            Minha Rede
          </h1>
          <p className="text-slate-600">Visualize sua equipe e estrutura de rede</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-heading font-bold text-primary-main">
                  {stats.total_network || 0}
                </p>
                <p className="text-sm text-slate-500">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-heading font-bold text-emerald-600">
                  {stats.level_1 || 0}
                </p>
                <p className="text-sm text-slate-500">1º Nível</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-heading font-bold text-blue-600">
                  {stats.level_2 || 0}
                </p>
                <p className="text-sm text-slate-500">2º Nível</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-heading font-bold text-purple-600">
                  {stats.level_3 || 0}
                </p>
                <p className="text-sm text-slate-500">3º Nível</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-heading font-bold text-accent-main">
                  {stats.active_this_month || 0}
                </p>
                <p className="text-sm text-slate-500">Ativos</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Estrutura da Rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tree.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Sua rede está vazia</p>
                <p className="text-sm text-slate-400 mt-1">
                  Compartilhe seu link de indicação para começar a construir sua equipe
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tree.map((node) => (
                  <NetworkNode key={node.user_id} node={node} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission levels explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funcionam as Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <span className="font-heading font-bold text-emerald-700">1º Nível - 10%</span>
                </div>
                <p className="text-sm text-slate-600">
                  Comissão sobre vendas dos seus indicados diretos
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <span className="font-heading font-bold text-blue-700">2º Nível - 5%</span>
                </div>
                <p className="text-sm text-slate-600">
                  Comissão sobre vendas dos indicados dos seus indicados
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <span className="font-heading font-bold text-purple-700">3º Nível - 5%</span>
                </div>
                <p className="text-sm text-slate-600">
                  Comissão sobre vendas da terceira geração
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
