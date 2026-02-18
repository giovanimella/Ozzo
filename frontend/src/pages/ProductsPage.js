import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout, { StatCard, DashCard } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { toast } from '../components/ui/toast';
import { 
  Plus, Edit, Trash2, Package, Search, Image,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    category: '',
    stock: '',
    weight: '',
    dimensions: { width: '', height: '', length: '' },
    images: [''],
    active: true
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
      stock: parseInt(formData.stock) || 0,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      dimensions: formData.dimensions.width ? formData.dimensions : null,
      images: formData.images.filter(img => img.trim())
    };

    try {
      const url = editingProduct 
        ? `${API_URL}/api/products/${editingProduct.product_id}`
        : `${API_URL}/api/products`;
      
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      if (res.ok) {
        toast.success(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
        setShowModal(false);
        resetForm();
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Erro ao salvar produto');
      }
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Produto excluído!');
        fetchProducts();
      }
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      discount_price: product.discount_price?.toString() || '',
      category: product.category,
      stock: product.stock.toString(),
      weight: product.weight?.toString() || '',
      dimensions: product.dimensions || { width: '', height: '', length: '' },
      images: product.images?.length ? product.images : [''],
      active: product.active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      discount_price: '',
      category: '',
      stock: '',
      weight: '',
      dimensions: { width: '', height: '', length: '' },
      images: [''],
      active: true
    });
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  return (
    <AppLayout title="Produtos" subtitle="Gerencie os produtos da loja">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-primary-main" data-testid="products-title">
              Produtos
            </h1>
            <p className="text-slate-600">Gerencie o catálogo de produtos</p>
          </div>
          
          <Button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-product-btn">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar produtos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="w-full md:w-48"
              >
                <option value="">Todas categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full spinner" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum produto encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.product_id} className="overflow-hidden">
                <div className="aspect-square bg-slate-100 relative">
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  {!product.active && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="error">Inativo</Badge>
                    </div>
                  )}
                  {product.discount_price && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="gold">Promoção</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">{product.category}</p>
                  <h3 className="font-heading font-bold text-primary-main mb-2 line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    {product.discount_price ? (
                      <>
                        <span className="text-lg font-bold text-accent-main">
                          {formatCurrency(product.discount_price)}
                        </span>
                        <span className="text-sm text-slate-400 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-primary-main">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    Estoque: {product.stock} unidades
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditModal(product)}
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(product.product_id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
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
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
            <h2 className="font-heading font-bold text-xl mb-6">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Produto"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  label="Categoria"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ex: Saúde, Beleza"
                  required
                />
              </div>

              <Textarea
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  required
                />
                <Input
                  label="Preço Promocional"
                  type="number"
                  step="0.01"
                  value={formData.discount_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_price: e.target.value }))}
                />
                <Input
                  label="Estoque"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Peso (kg)"
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                />
                <Input
                  label="Largura (cm)"
                  type="number"
                  value={formData.dimensions.width}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dimensions: { ...prev.dimensions, width: e.target.value }
                  }))}
                />
                <Input
                  label="Altura (cm)"
                  type="number"
                  value={formData.dimensions.height}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dimensions: { ...prev.dimensions, height: e.target.value }
                  }))}
                />
                <Input
                  label="Comprimento (cm)"
                  type="number"
                  value={formData.dimensions.length}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dimensions: { ...prev.dimensions, length: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URLs das Imagens
                </label>
                {formData.images.map((url, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => {
                        const newImages = [...formData.images];
                        newImages[idx] = e.target.value;
                        setFormData(prev => ({ ...prev, images: newImages }));
                      }}
                    />
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addImageField}>
                  <Plus className="w-4 h-4" /> Adicionar imagem
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-sm text-slate-700">Produto ativo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Atualizar' : 'Criar Produto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
