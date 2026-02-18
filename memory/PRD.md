# Vanguard MLM - Product Requirements Document

## Original Problem Statement
Sistema de Marketing Multinível com 7 níveis de acesso hierárquicos, comissões até 3ª geração (10%, 5%, 5%), loja online integrada, carteira financeira interna, sistema de qualificação mensal, e gestão completa de rede multinível.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Lucide Icons
- **Backend**: FastAPI (Python) 
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth (Emergent Auth)

## User Personas

### Access Level 0 - Admin Técnico
- Controle total do sistema
- Configurações de API (PagSeguro, MercadoPago, Resend)
- Taxas, valores mínimos, comissões

### Access Level 1 - Admin Geral
- Supervisão de relatórios e usuários
- Aprovação de saques
- Convites para Líder de Equipe
- Conversão de usuários

### Access Level 2 - Supervisor Comercial
- Gerencia carteira de revendedores
- Auxilia em compras e cadastros
- Contato direto com revendedores

### Access Level 3 - Líder de Equipe
- Revendedor promovido por convite
- Visão expandida da rede
- Relatórios de equipe

### Access Level 4 - Revendedor
- Preços diferenciados
- Comissões até 3º nível
- Link de vendas exclusivo
- Cadastra novos revendedores

### Access Level 5 - Cliente
- Compras na loja online
- Pode indicar outros clientes (comissão única)
- Pode ser convertido para Revendedor

### Access Level 6 - Embaixador/Indicador
- Link exclusivo de vendas
- Comissão configurável individualmente
- Não entra na rede multinível

## Core Requirements (Static)

### Sistema de Comissões
- Nível 1: 10% (indicação direta)
- Nível 2: 5% (segunda geração)
- Nível 3: 5% (terceira geração)
- Comissão sobre valor cheio do produto (sem frete)
- Saldo bloqueado por 7 dias após pagamento
- Estorno automático se cancelado em até 7 dias

### Qualificação Mensal
- Volume mínimo de compras pessoais configurável
- 6 meses sem qualificar = status SUSPENSO
- 12 meses sem atividade = cadastro CANCELADO
- Rede sobe automaticamente para patrocinador

### Carteira Financeira
- Saldo bloqueado + Saldo disponível
- Valor mínimo de saque configurável
- Taxa de saque configurável
- Aprovação manual pelo Admin Geral

## What's Been Implemented (Feb 2026)

### Backend (100% Functional)
- [x] Autenticação JWT + Google OAuth
- [x] CRUD completo de usuários por nível
- [x] CRUD de produtos (loja estilo WooCommerce)
- [x] Sistema de pedidos
- [x] Motor de comissões multinível (3 níveis)
- [x] Carteira financeira (saldo bloqueado/disponível)
- [x] Sistema de saques com aprovação
- [x] API de rede hierárquica (árvore MLM)
- [x] Configurações administrativas
- [x] Sistema de logs de auditoria
- [x] Rastreio de indicações (cookie 30 dias)
- [x] Processamento de liberação de comissões
- [x] **Ranking de Revendedores** - 4 métricas (vendas, comissões, rede, pontos), 5 períodos
- [x] **Sistema de Metas e Bonificações** - CRUD completo com cálculo de progresso
- [x] **Links de Indicação com Tracking** - Geração de links, rastreamento de cliques, estatísticas
- [x] **Exportação de Relatórios** - CSV/JSON para vendas, comissões, usuários, rede
- [x] **Dashboards por Nível de Acesso** - Supervisor, Líder, Cliente

### Frontend (100% UI) - TODAS TESTADAS E FUNCIONAIS
- [x] Landing page profissional
- [x] Login (JWT + Google OAuth)
- [x] Registro com seleção de nível
- [x] Dashboard Admin (estatísticas, usuários, saques)
- [x] Dashboard Revendedor (comissões, rede, qualificação)
- [x] Página de Produtos (CRUD)
- [x] Página de Configurações
- [x] Página de Usuários
- [x] Página de Rede (árvore hierárquica)
- [x] Página de Carteira
- [x] Loja Online (catálogo, carrinho)
- [x] Perfil (dados pessoais, bancários)
- [x] **Página de Pedidos (/orders)** - Lista, filtros, detalhes, atualização de status
- [x] **Página de Relatórios (/reports)** - Gráficos Recharts + Exportação CSV/JSON
- [x] **Página de Saques (/withdrawals)** - Gestão completa com aprovar/rejeitar
- [x] **Página de Logs (/logs)** - Histórico de auditoria com filtros
- [x] **Página de Checkout (/checkout)** - Fluxo 3 etapas (Carrinho, Entrega, Pagamento)
- [x] **Página de Ranking (/ranking)** - Ranking com pódio, filtros por período/métrica
- [x] **Página de Metas (/goals)** - CRUD de metas, progresso visual, conquistas
- [x] **Página de Links de Indicação (/referral-links)** - Link, código, estatísticas, dicas

### Integrações (ESTRUTURA PRONTA - Requer Chaves de API)
- [x] PagSeguro (estrutura pronta, credenciais via settings)
- [x] MercadoPago (estrutura pronta, credenciais via settings)
- [x] Resend Email (estrutura pronta, credenciais via settings)
- [x] Google OAuth (Emergent Auth - Funcional)

## Testing Status (Feb 18, 2026)
- **Backend**: 100% (33/33 testes passaram) - Ranking, Metas, Referral Links, Export
- **Frontend**: 100% (Todas as páginas renderizam corretamente)
- **Arquivos de testes**: 
  - `/app/backend/tests/test_mlm_vanguard.py`
  - `/app/backend/tests/test_new_features.py`
- **Relatórios**: 
  - `/app/test_reports/iteration_3.json`
  - `/app/test_reports/iteration_4.json`

## Prioritized Backlog

### P0 - Critical (Próximo Sprint)
- [ ] Ativar integração real com PagSeguro (requer chaves do usuário)
- [ ] Ativar integração real com MercadoPago (requer chaves do usuário)
- [ ] Envio de emails transacionais (Resend - requer chave do usuário)
- [ ] Job automático de verificação de qualificação mensal (cron job)

### P1 - High Priority
- [x] ~~Relatórios exportáveis (PDF/Excel)~~ - CSV/JSON implementado
- [x] ~~Ranking de revendedores~~ - Implementado com 4 métricas
- [x] ~~Sistema de metas e bonificações~~ - Implementado com progresso e conquistas
- [ ] Notificações push/email
- [ ] Histórico detalhado de comissões

### P2 - Medium Priority
- [x] ~~Sistema de links de indicação e tracking~~ - Implementado com estatísticas
- [ ] Sistema de tickets/suporte
- [ ] Chat entre supervisor e revendedor
- [ ] Calculadora de frete real (Correios/Transportadoras)
- [ ] Integração com ERP
- [ ] App mobile (React Native)
- [ ] QR Code para links de indicação (estrutura pronta, geração de imagem pendente)

## Next Tasks List
1. **Ativar PagSeguro** - Usuário precisa fornecer credenciais
2. **Ativar MercadoPago** - Usuário precisa fornecer credenciais
3. **Ativar Resend** - Usuário precisa fornecer API key
4. Criar job de verificação mensal de qualificações (scheduler)
5. Geração de QR Code para links de indicação

## Technical Debt
- Otimizar queries de árvore de rede (usar $graphLookup)
- Adicionar cache para estatísticas do dashboard
- Implementar rate limiting nas APIs públicas
- Refatorar server.py em módulos (routes/)
- Criar serviço de API centralizado no frontend
- Migrar para React Router v7 (warnings atuais)

---
*Last updated: February 18, 2026 - Ranking, Metas, Links de Indicação e Exportação implementados*
