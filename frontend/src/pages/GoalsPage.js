import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatDate } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Target, Trophy, Gift, Plus, Edit2, Trash2,
  CheckCircle, Clock, TrendingUp, Calendar, X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function GoalsPage() {
  const { token, accessLevel, user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric: 'sales',
    target_value: '',
    bonus_amount: '',
    bonus_type: 'fixed',
    start_date: '',
    end_date: '',
    access_levels: [3, 4],
    active: true
  });

  useEffect(() => {
    fetchGoals();
    fetchAchievements();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/goals?active_only=false`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals);
      }
    } catch (error) {
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await fetch(`${API_URL}/api/goals/achievements/${user?.user_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingGoal 
        ? `${API_URL}/api/goals/${editingGoal.goal_id}`
        : `${API_URL}/api/goals`;
      
      const res = await fetch(url, {
        method: editingGoal ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          target_value: parseFloat(formData.target_value),
          bonus_amount: parseFloat(formData.bonus_amount)
        })
      });

      if (res.ok) {
        toast.success(editingGoal ? 'Meta atualizada!' : 'Meta criada!');
        fetchGoals();
        closeModal();
      } else {
        toast.error('Erro ao salvar meta');
      }
    } catch (error) {
      toast.error('Erro ao salvar meta');
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta meta?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Meta excluída!');
        fetchGoals();
      } else {
        toast.error('Erro ao excluir meta');
      }
    } catch (error) {
      toast.error('Erro ao excluir meta');
    }
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      metric: goal.metric,
      target_value: goal.target_value,
      bonus_amount: goal.bonus_amount,
      bonus_type: goal.bonus_type,
      start_date: goal.start_date?.split('T')[0] || '',
      end_date: goal.end_date?.split('T')[0] || '',
      access_levels: goal.access_levels,
      active: goal.active
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      name: '',
      description: '',
      metric: 'sales',
      target_value: '',
      bonus_amount: '',
      bonus_type: 'fixed',
      start_date: '',
      end_date: '',
      access_levels: [3, 4],
      active: true
    });
  };

  const getMetricLabel = (metric) => {
    const labels = {
      sales: 'Vendas',
      commissions: 'Comissões',
      network: 'Novos Membros',
      personal_volume: 'Volume Pessoal'
    };
    return labels[metric] || metric;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-slate-300';
  };

  const isAdmin = accessLevel <= 1;

  return (
    <AppLayout title="Metas e Bonificações" subtitle="Acompanhe suas metas e conquistas">
      <div className="space-y-6">
        {/* Header with action */}
        {isAdmin && (
          <div className="flex justify-end">
            <button 
              onClick={() => setShowModal(true)} 
              data-testid="create-goal-btn"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-main text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Meta
            </button>
          </div>
        )}

        {/* My Achievements */}
        {achievements.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="font-heading font-semibold text-emerald-700 flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5" />
              Minhas Conquistas ({achievements.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {achievements.slice(0, 5).map((ach) => (
                <div
                  key={ach.achievement_id}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-emerald-200 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{ach.goal_name}</span>
                </div>
              ))}
              {achievements.length > 5 && (
                <span className="text-sm text-emerald-600 self-center">
                  +{achievements.length - 5} mais
                </span>
              )}
            </div>
          </div>
        )}

        {/* Active Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-brand-main border-t-transparent rounded-full animate-spin" />
            </div>
          ) : goals.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-100">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma meta disponível</p>
            </div>
          ) : (
            goals.map((goal) => (
              <div key={goal.goal_id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${goal.progress?.completed ? 'border-emerald-300' : 'border-slate-100'}`}>
                <div className={`h-1.5 ${getProgressColor(goal.progress?.percentage || 0)}`} 
                  style={{ width: `${Math.min(goal.progress?.percentage || 0, 100)}%` }} 
                />
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-bold text-slate-900">{goal.name}</h3>
                      <p className="text-sm text-slate-500">{goal.description}</p>
                    </div>
                    
                    {goal.progress?.completed ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Concluída
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                        <Clock className="w-3 h-3" />
                        Em Andamento
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Métrica: {getMetricLabel(goal.metric)}</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Progresso</span>
                        <span className="font-medium">{goal.progress?.percentage || 0}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressColor(goal.progress?.percentage || 0)} transition-all duration-500`}
                          style={{ width: `${Math.min(goal.progress?.percentage || 0, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>
                          {goal.metric === 'network' 
                            ? `${goal.progress?.current_value || 0} membros`
                            : formatCurrency(goal.progress?.current_value || 0)}
                        </span>
                        <span>
                          Meta: {goal.metric === 'network' 
                            ? `${goal.target_value} membros`
                            : formatCurrency(goal.target_value)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600">
                        Bônus: {goal.bonus_type === 'percentage' 
                          ? `${goal.bonus_amount}%`
                          : formatCurrency(goal.bonus_amount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>até {formatDate(goal.end_date)}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => openEditModal(goal)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(goal.goal_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="font-heading font-bold text-xl text-primary-main">
                {editingGoal ? 'Editar Meta' : 'Nova Meta'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Nome da Meta *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Input
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Métrica *</label>
                  <select
                    value={formData.metric}
                    onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                    required
                  >
                    <option value="sales">Vendas</option>
                    <option value="commissions">Comissões</option>
                    <option value="network">Novos Membros</option>
                    <option value="personal_volume">Volume Pessoal</option>
                  </select>
                </div>
                
                <Input
                  label="Valor Alvo *"
                  type="number"
                  step="0.01"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Valor do Bônus *"
                  type="number"
                  step="0.01"
                  value={formData.bonus_amount}
                  onChange={(e) => setFormData({ ...formData, bonus_amount: e.target.value })}
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Bônus</label>
                  <select
                    value={formData.bonus_type}
                    onChange={(e) => setFormData({ ...formData, bonus_type: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="fixed">Valor Fixo (R$)</option>
                    <option value="percentage">Percentual (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Data Início *"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
                
                <Input
                  label="Data Fim *"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-sm text-slate-700">Meta ativa</label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingGoal ? 'Salvar' : 'Criar Meta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
