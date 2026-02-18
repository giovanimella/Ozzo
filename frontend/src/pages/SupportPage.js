import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Ticket, Plus, Filter, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [stats, setStats] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    category: 'Financeiro',
    subject: '',
    description: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchTickets();
    if (user.access_level <= 2) {
      fetchStats();
    }
  }, [filterStatus, filterCategory]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tickets?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTickets(data.tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tickets/stats/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ category: 'Financeiro', subject: '', description: '', priority: 'normal' });
        fetchTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Aberto',
      in_progress: 'Em Andamento',
      resolved: 'Resolvido',
      closed: 'Fechado'
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      baixa: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      alta: 'bg-orange-100 text-orange-700',
      urgente: 'bg-red-100 text-red-700'
    };
    return colors[priority] || colors.normal;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="support-title">Central de Suporte</h1>
            <p className="text-gray-600 mt-1">Gerencie seus tickets de atendimento</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="create-ticket-btn"
          >
            <Plus className="w-5 h-5" />
            Novo Ticket
          </button>
        </div>

        {/* Stats for Admins/Supervisors */}
        {user.access_level <= 2 && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Ticket className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Abertos</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.by_status.open}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Em Andamento</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.by_status.in_progress}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolvidos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.by_status.resolved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="filter-status"
          >
            <option value="">Todos os Status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em Andamento</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="filter-category"
          >
            <option value="">Todas as Categorias</option>
            <option value="Financeiro">Financeiro</option>
            <option value="Produto">Produto</option>
            <option value="Rede">Rede</option>
            <option value="Técnico">Técnico</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Nenhum ticket encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <div
                  key={ticket.ticket_id}
                  onClick={() => navigate(`/support/${ticket.ticket_id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  data-testid={`ticket-${ticket.ticket_id}`}
                >
                  <div className="flex items-start gap-4">
                    {getStatusIcon(ticket.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {ticket.subject}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {ticket.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{getStatusLabel(ticket.status)}</span>
                        <span>•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                        {ticket.reply_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {ticket.reply_count} {ticket.reply_count === 1 ? 'resposta' : 'respostas'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Novo Ticket de Suporte</h2>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Financeiro">Financeiro</option>
                  <option value="Produto">Produto</option>
                  <option value="Rede">Rede</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva brevemente sua dúvida ou problema"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="6"
                  placeholder="Descreva sua dúvida ou problema com o máximo de detalhes possível"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  data-testid="submit-ticket-btn"
                >
                  Criar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
