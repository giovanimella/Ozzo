import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  ShoppingBag, Truck, CreditCard, CheckCircle, 
  ArrowLeft, Minus, Plus, Trash2, MapPin
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function CheckoutPage() {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);
  
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip: '',
    phone: user?.phone || ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState('pix');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
    loadCart();
    
    // Load saved address from user profile
    if (user?.address) {
      setShippingAddress(prev => ({
        ...prev,
        ...user.address,
        name: user.name,
        phone: user.phone
      }));
    }
  }, [isAuthenticated, user]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      if (items.length === 0) {
        navigate('/store');
        return;
      }
      setCart(items);
    } else {
      navigate('/store');
    }
  };

  const updateQuantity = (productId, delta) => {
    const newCart = cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    
    if (newCart.length === 0) {
      navigate('/store');
      return;
    }
    
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  const removeItem = (productId) => {
    const newCart = cart.filter(item => item.product_id !== productId);
    if (newCart.length === 0) {
      localStorage.removeItem('cart');
      navigate('/store');
      return;
    }
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.discount_price || item.price;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getShipping = () => {
    // Simplified shipping calculation
    return 15.00;
  };

  const getTotal = () => {
    return getSubtotal() + getShipping();
  };

  const validateAddress = () => {
    const required = ['name', 'street', 'number', 'neighborhood', 'city', 'state', 'zip'];
    for (const field of required) {
      if (!shippingAddress[field]?.trim()) {
        toast.error('Preencha todos os campos obrigatórios');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateAddress()) return;
    setStep(step + 1);
  };

  const handleSubmitOrder = async () => {
    setLoading(true);
    
    try {
      // Get referral code from localStorage if exists
      const referralCode = localStorage.getItem('referral_code');
      const referralExpiry = localStorage.getItem('referral_expiry');
      
      let validReferral = null;
      if (referralCode && referralExpiry && Date.now() < parseInt(referralExpiry)) {
        validReferral = referralCode;
      }

      const orderData = {
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        referral_code: validReferral
      };

      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        const order = await res.json();
        setOrderId(order.order_id);
        setOrderComplete(true);
        localStorage.removeItem('cart');
        localStorage.removeItem('referral_code');
        localStorage.removeItem('referral_expiry');
        toast.success('Pedido realizado com sucesso!');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Erro ao criar pedido');
      }
    } catch (error) {
      toast.error('Erro ao processar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="py-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-primary-main mb-2">
              Pedido Realizado!
            </h1>
            <p className="text-slate-600 mb-4">
              Seu pedido #{orderId} foi criado com sucesso.
            </p>
            <p className="text-sm text-slate-500 mb-8">
              Você receberá atualizações sobre o status do seu pedido por email.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" onClick={() => navigate('/my-orders')}>
                Ver Meus Pedidos
              </Button>
              <Button onClick={() => navigate('/store')}>
                Continuar Comprando
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <button 
            onClick={() => navigate('/store')}
            className="flex items-center gap-2 text-slate-600 hover:text-primary-main"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar à loja</span>
          </button>
          <h1 className="flex-1 text-center font-heading font-bold text-xl text-primary-main">
            Checkout
          </h1>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: 'Carrinho', icon: ShoppingBag },
              { num: 2, label: 'Entrega', icon: Truck },
              { num: 3, label: 'Pagamento', icon: CreditCard },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                {idx > 0 && <div className={`w-12 h-0.5 ${step >= s.num ? 'bg-primary-main' : 'bg-slate-200'}`} />}
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-primary-main' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${step >= s.num ? 'bg-primary-main text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {s.num}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{s.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Cart Review */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Revise seu Carrinho
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.product_id} className="flex gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="w-20 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ShoppingBag className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-primary-main truncate">{item.name}</h4>
                          <p className="text-sm text-slate-500">{item.category}</p>
                          <p className="text-accent-main font-bold mt-1">
                            {formatCurrency(item.discount_price || item.price)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateQuantity(item.product_id, -1)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.product_id, 1)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeItem(item.product_id)}
                            className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Shipping Address */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome Completo *"
                      value={shippingAddress.name}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      label="Telefone"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="CEP *"
                      value={shippingAddress.zip}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, zip: e.target.value }))}
                      placeholder="00000-000"
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Rua *"
                        value={shippingAddress.street}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input
                      label="Número *"
                      value={shippingAddress.number}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, number: e.target.value }))}
                    />
                    <Input
                      label="Complemento"
                      value={shippingAddress.complement}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, complement: e.target.value }))}
                    />
                    <Input
                      label="Bairro *"
                      value={shippingAddress.neighborhood}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Cidade *"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                      />
                      <Input
                        label="UF *"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { value: 'pix', label: 'PIX', desc: 'Aprovação instantânea' },
                    { value: 'boleto', label: 'Boleto Bancário', desc: 'Vencimento em 3 dias úteis' },
                    { value: 'credit_card', label: 'Cartão de Crédito', desc: 'Em até 12x sem juros' },
                  ].map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors
                        ${paymentMethod === method.value ? 'border-primary-main bg-primary-main/5' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-5 h-5 text-primary-main"
                      />
                      <div>
                        <p className="font-medium text-primary-main">{method.label}</p>
                        <p className="text-sm text-slate-500">{method.desc}</p>
                      </div>
                    </label>
                  ))}

                  {paymentMethod === 'pix' && (
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-700">
                        Após finalizar o pedido, você receberá o QR Code do PIX para pagamento.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              {step > 1 ? (
                <Button variant="secondary" onClick={() => setStep(step - 1)}>
                  Voltar
                </Button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <Button onClick={handleNextStep}>
                  Continuar
                </Button>
              ) : (
                <Button onClick={handleSubmitOrder} loading={loading} data-testid="confirm-order-btn">
                  Finalizar Pedido
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex justify-between">
                      <span className="text-slate-600">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrency((item.discount_price || item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span>{formatCurrency(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Frete</span>
                    <span>{formatCurrency(getShipping())}</span>
                  </div>
                </div>
                
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between">
                    <span className="font-heading font-bold text-lg">Total</span>
                    <span className="font-heading font-bold text-lg text-primary-main">
                      {formatCurrency(getTotal())}
                    </span>
                  </div>
                </div>

                {localStorage.getItem('referral_code') && (
                  <div className="p-3 bg-accent-light/20 rounded-lg">
                    <p className="text-xs text-slate-600">
                      Código de indicação: <strong>{localStorage.getItem('referral_code')}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
