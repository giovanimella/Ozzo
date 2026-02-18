import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Package, Eye, ChevronLeft, ChevronRight, 
  Truck, CheckCircle, XCircle, Clock, CreditCard
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function OrdersPage() {
  const { token, accessLevel } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_URL}/api/orders?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotalPages(data.pages);
      }
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Status atualizado!');
        fetchOrders();
        if (selectedOrder?.order_id === orderId) {
          setSelectedOrder(prev => ({ ...prev, order_status: newStatus }));
        }
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { variant: 'warning', label: 'Pendente', icon: Clock },
      paid: { variant: 'info', label: 'Pago', icon: CreditCard },
      shipped: { variant: 'default', label: 'Enviado', icon: Truck },
      delivered: { variant: 'success', label: 'Entregue', icon: CheckCircle },
      cancelled: { variant: 'error', label: 'Cancelado', icon: XCircle },
    };
    const { variant, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getPaymentBadge = (status) => {
    return status === 'paid' 
      ? <Badge variant="success">Pago</Badge>
      : <Badge variant="warning">Pendente</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="orders-title">
              {accessLevel <= 2 ? 'Todos os Pedidos' : 'Meus Pedidos'}
            </h1>
            <p className="text-slate-600">
              {accessLevel <= 2 ? 'Gerencie todos os pedidos do sistema' : 'Acompanhe seus pedidos'}
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 px-4 bg-white border border-slate-200 rounded-lg"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregue</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        {/* Orders List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-4 font-medium text-slate-600">Pedido</th>
                      <th className="text-left p-4 font-medium text-slate-600">Data</th>
                      <th className="text-left p-4 font-medium text-slate-600">Itens</th>
                      <th className="text-left p-4 font-medium text-slate-600">Total</th>
                      <th className="text-left p-4 font-medium text-slate-600">Pagamento</th>
                      <th className="text-left p-4 font-medium text-slate-600">Status</th>
                      <th className="text-right p-4 font-medium text-slate-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.order_id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-4">
                          <span className="font-mono text-sm font-medium text-primary-main">
                            #{order.order_id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
                        </td>
                        <td className="p-4 font-medium text-primary-main">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="p-4">
                          {getPaymentBadge(order.payment_status)}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(order.order_status)}
                        </td>
                        <td className="p-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100">
                <p className="text-sm text-slate-600">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-xl text-primary-main">
                    Pedido #{selectedOrder.order_id.slice(-8).toUpperCase()}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(selectedOrder.created_at)}
                  </p>
                </div>
                {getStatusBadge(selectedOrder.order_status)}
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Items */}
              <div>
                <h3 className="font-medium text-primary-main mb-3">Itens do Pedido</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-slate-500">
                          {formatCurrency(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="font-medium text-primary-main mb-3">Endereço de Entrega</h3>
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <p>{selectedOrder.shipping_address?.name}</p>
                  <p>{selectedOrder.shipping_address?.street}, {selectedOrder.shipping_address?.number}</p>
                  {selectedOrder.shipping_address?.complement && (
                    <p>{selectedOrder.shipping_address.complement}</p>
                  )}
                  <p>
                    {selectedOrder.shipping_address?.neighborhood} - {selectedOrder.shipping_address?.city}/{selectedOrder.shipping_address?.state}
                  </p>
                  <p>CEP: {selectedOrder.shipping_address?.zip}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Frete</span>
                    <span>{formatCurrency(selectedOrder.shipping)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary-main">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Referrer info */}
              {selectedOrder.referrer_id && (
                <div className="p-3 bg-accent-light/20 rounded-lg">
                  <p className="text-sm text-slate-600">
                    Indicado por: <strong>{selectedOrder.referrer_type}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div className="p-6 border-t border-slate-200">
              {accessLevel <= 2 && selectedOrder.order_status !== 'cancelled' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedOrder.order_status === 'pending' && (
                    <Button size="sm" onClick={() => updateOrderStatus(selectedOrder.order_id, 'paid')}>
                      Marcar como Pago
                    </Button>
                  )}
                  {selectedOrder.order_status === 'paid' && (
                    <Button size="sm" onClick={() => updateOrderStatus(selectedOrder.order_id, 'shipped')}>
                      Marcar como Enviado
                    </Button>
                  )}
                  {selectedOrder.order_status === 'shipped' && (
                    <Button size="sm" onClick={() => updateOrderStatus(selectedOrder.order_id, 'delivered')}>
                      Marcar como Entregue
                    </Button>
                  )}
                  {['pending', 'paid'].includes(selectedOrder.order_status) && (
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => updateOrderStatus(selectedOrder.order_id, 'cancelled')}
                    >
                      Cancelar Pedido
                    </Button>
                  )}
                </div>
              )}
              
              <Button variant="secondary" onClick={() => setSelectedOrder(null)} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
