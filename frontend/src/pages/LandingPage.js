import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { 
  ArrowRight, Users, TrendingUp, Wallet, Shield, 
  ChevronRight, Star, CheckCircle
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="font-heading font-bold text-primary-main text-xl">Vanguard</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-primary-main transition-colors">Recursos</a>
            <a href="#how-it-works" className="text-slate-600 hover:text-primary-main transition-colors">Como Funciona</a>
            <a href="#commission" className="text-slate-600 hover:text-primary-main transition-colors">Comissões</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" data-testid="login-link">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" data-testid="register-link">Começar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="fade-in">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light/20 text-accent-main text-sm font-medium mb-6">
                <Star className="w-4 h-4" />
                Sistema MLM Completo
              </span>
              <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl text-primary-main leading-tight mb-6">
                Construa sua <span className="text-accent-main">rede de sucesso</span> com Vanguard
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-xl">
                Plataforma completa de marketing multinível com comissões até 3ª geração, loja integrada e carteira financeira. Tudo que você precisa para crescer.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="hero-cta">
                    Comece Agora <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/store">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    Ver Produtos
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="fade-in stagger-2 relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1758518730523-c9f6336ebdae?w=800&q=80" 
                  alt="Team success"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 fade-in stagger-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 gold-gradient rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Comissão Total</p>
                    <p className="font-heading font-bold text-xl text-primary-main">20%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-primary-main mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Recursos completos para gerenciar sua rede, acompanhar vendas e maximizar seus ganhos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: 'Rede Multinível', desc: 'Ganhe comissões até o 3º nível da sua rede' },
              { icon: TrendingUp, title: 'Dashboard Completo', desc: 'Acompanhe vendas, comissões e desempenho' },
              { icon: Wallet, title: 'Carteira Digital', desc: 'Gerencie seus ganhos e solicite saques' },
              { icon: Shield, title: 'Sistema Seguro', desc: 'Proteção total dos seus dados e transações' },
            ].map((feature, i) => (
              <div 
                key={i}
                className="p-6 rounded-xl border border-slate-100 hover:shadow-lg transition-shadow duration-300 fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-primary-main/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-main" />
                </div>
                <h3 className="font-heading font-bold text-lg text-primary-main mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section id="commission" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-primary-main mb-6">
                Estrutura de Comissões Transparente
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Ganhe comissões sobre as vendas da sua rede em até 3 níveis de profundidade. Quanto maior sua rede, maiores seus ganhos.
              </p>

              <div className="space-y-4">
                {[
                  { level: '1º Nível', rate: '10%', desc: 'Indicações diretas' },
                  { level: '2º Nível', rate: '5%', desc: 'Indicações dos seus indicados' },
                  { level: '3º Nível', rate: '5%', desc: 'Terceira geração' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
                    <div className="w-16 h-16 gold-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-heading font-bold text-xl">{item.rate}</span>
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-primary-main">{item.level}</h4>
                      <p className="text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary-main rounded-2xl p-8 text-white">
              <h3 className="font-heading font-bold text-2xl mb-6">Exemplo de Ganhos</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/20">
                  <span>Vendas 1º Nível</span>
                  <span className="font-bold">R$ 10.000</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/20">
                  <span>Comissão 10%</span>
                  <span className="font-bold text-accent-light">R$ 1.000</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/20">
                  <span>Vendas 2º Nível</span>
                  <span className="font-bold">R$ 20.000</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/20">
                  <span>Comissão 5%</span>
                  <span className="font-bold text-accent-light">R$ 1.000</span>
                </div>
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg font-heading">Total do Mês</span>
                  <span className="text-2xl font-heading font-bold text-accent-light">R$ 2.000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary-main">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-6">
            Pronto para começar sua jornada?
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Junte-se a milhares de revendedores que já estão construindo seu sucesso com a Vanguard.
          </p>
          <Link to="/register">
            <Button variant="gold" size="lg" data-testid="footer-cta">
              Criar Minha Conta Grátis <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-primary-dark text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">V</span>
                </div>
                <span className="font-heading font-bold text-white text-lg">Vanguard</span>
              </div>
              <p className="text-sm">
                Sistema completo de marketing multinível para impulsionar seu negócio.
              </p>
            </div>
            
            <div>
              <h4 className="font-heading font-bold text-white mb-4">Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#commission" className="hover:text-white transition-colors">Comissões</a></li>
                <li><Link to="/store" className="hover:text-white transition-colors">Loja</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-heading font-bold text-white mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-heading font-bold text-white mb-4">Contato</h4>
              <ul className="space-y-2 text-sm">
                <li>contato@vanguard.com</li>
                <li>(11) 99999-9999</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-700 text-center text-sm">
            &copy; {new Date().getFullYear()} Vanguard MLM. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
