import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { ArrowLeft, Send, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';

export default function TicketDetailPage() {
  const { ticket_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isStaff = user.access_level <= 2;

  useEffect(() => {
    fetchTicket();
  }, [ticket_id]);

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tickets/${ticket_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTicket(data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tickets/${ticket_id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: replyMessage })
      });

      setReplyMessage('');
      fetchTicket();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tickets/${ticket_id}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchTicket();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-amber-100 text-amber-700 border-amber-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
      closed: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status] || colors.open;
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

  if (loading) {
    return (
      <AppLayout title="Carregando..." subtitle="Aguarde">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Carregando ticket...</div>
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout title="Não encontrado" subtitle="">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Ticket não encontrado</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Ticket #${ticket_id.slice(-8)}`} subtitle={ticket.subject} showBack={true}>
      <div className="max-w-4xl mx-auto space-y-6">

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.subject}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
                    {ticket.category}
                  </span>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-700">
                    {ticket.priority}
                  </span>
                </div>
              </div>

              {/* Status Actions for Staff */}
              {isStaff && ticket.status !== 'closed' && (
                <div className="flex gap-2">
                  {ticket.status === 'open' && (
                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      Em Andamento
                    </button>
                  )}
                  {ticket.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus('resolved')}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      Resolver
                    </button>
                  )}
                  {ticket.status === 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus('closed')}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Fechar
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Criado por:</strong> {ticket.user_name} ({ticket.user_email})</p>
              <p><strong>Data:</strong> {new Date(ticket.created_at).toLocaleString('pt-BR')}</p>
              {ticket.updated_at && (
                <p><strong>Última atualização:</strong> {new Date(ticket.updated_at).toLocaleString('pt-BR')}</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Respostas</h2>
          
          {ticket.replies && ticket.replies.length > 0 ? (
            ticket.replies.map((reply) => (
              <div
                key={reply.reply_id}
                className={`bg-white rounded-lg border p-4 ${
                  reply.is_staff ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${reply.is_staff ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <User className={`w-5 h-5 ${reply.is_staff ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{reply.user_name}</span>
                      {reply.is_staff && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
                          Equipe
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {new Date(reply.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              Nenhuma resposta ainda
            </div>
          )}
        </div>

        {/* Reply Form */}
        {ticket.status !== 'closed' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <form onSubmit={handleReply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isStaff ? 'Responder ao Cliente' : 'Adicionar Comentário'}
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Digite sua mensagem..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sending || !replyMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Enviando...' : 'Enviar Resposta'}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
