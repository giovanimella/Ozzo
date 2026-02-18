import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  ShoppingCart, Search, Filter, Package, 
  Plus, Minus, X, ChevronLeft, ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function StorePage() {
  const { isAuthenticated, token } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  // Save referral code to localStorage
  useEffect(() => {
    if (referralCode) {
      localStorage.setItem('referral_code', referralCode);
      localStorage.setItem('referral_expiry', Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }, [referralCode]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    loadCart();
  }, [page, selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, active: true });
      if (selectedCategory) params.append('category', selectedCategory);
      if (search) params.append('search', search);

      const res = await fetch(`${API_URL}/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setTotalPages(data.pages);
      }
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.product_id);
    if (existing) {
      const newCart = cart.map(item => 
        item.product_id === product.product_id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      saveCart(newCart);
    } else {
      saveCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success('Adicionado ao carrinho!');
  };

  const updateQuantity = (productId, delta) => {
    const newCart = cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    saveCart(newCart);
  };

  const removeFromCart = (productId) => {
    saveCart(cart.filter(item => item.product_id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.discount_price || item.price;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="font-heading font-bold text-primary-main text-xl">Vanguard</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
            )}

            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 text-slate-600 hover:text-primary-main"
              data-testid="cart-button"
            >
              <ShoppingCart className="w-6 h-6" />
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-main text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {getCartCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Referral Banner */}
      {referralCode && (
        <div className="bg-accent-main text-white py-2 text-center text-sm">
          Você foi indicado! Seu código de referência: <strong>{referralCode}</strong>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-24">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-main/20"
                />
              </div>

              {/* Categories */}
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <h3 className="font-heading font-bold text-primary-main mb-4">Categorias</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => { setSelectedCategory(''); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      !selectedCategory ? 'bg-primary-main text-white' : 'hover:bg-slate-100'
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === cat ? 'bg-primary-main text-white' : 'hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <h1 className="font-heading font-bold text-2xl text-primary-main mb-6" data-testid="store-title">
              {selectedCategory || 'Todos os Produtos'}
            </h1>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhum produto encontrado</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.product_id} className="overflow-hidden group">
                      <div className="aspect-square bg-slate-100 relative overflow-hidden">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-slate-300" />
                          </div>
                        )}
                        {product.discount_price && (
                          <Badge variant="gold" className="absolute top-3 right-3">
                            Oferta
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 mb-1">{product.category}</p>
                        <h3 className="font-heading font-bold text-primary-main mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            {product.discount_price ? (
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-accent-main">
                                  {formatCurrency(product.discount_price)}
                                </span>
                                <span className="text-sm text-slate-400 line-through">
                                  {formatCurrency(product.price)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-primary-main">
                                {formatCurrency(product.price)}
                              </span>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => addToCart(product)}
                            data-testid={`add-to-cart-${product.product_id}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      variant="secondary"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-slate-600">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-heading font-bold text-xl">Carrinho</h2>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Seu carrinho está vazio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex gap-4 p-3 bg-slate-50 rounded-lg">
                      <div className="w-20 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-primary-main truncate">{item.name}</h4>
                        <p className="text-sm text-accent-main font-bold">
                          {formatCurrency(item.discount_price || item.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => updateQuantity(item.product_id, -1)}
                            className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product_id, 1)}
                            className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => removeFromCart(item.product_id)}
                            className="ml-auto text-red-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 p-4 space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-heading font-bold text-primary-main">
                    {formatCurrency(getCartTotal())}
                  </span>
                </div>
                <Link to={isAuthenticated ? "/checkout" : "/login?redirect=/checkout"}>
                  <Button className="w-full" size="lg" data-testid="checkout-btn">
                    Finalizar Compra
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
