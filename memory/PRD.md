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

### Frontend (100% UI)
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

### Integrações (MOCKED - Configuráveis)
- [x] PagSeguro (estrutura pronta, credenciais via settings)
- [x] MercadoPago (estrutura pronta, credenciais via settings)
- [x] Resend Email (estrutura pronta, credenciais via settings)

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Página de Checkout com integração de pagamento
- [ ] Processamento real de pagamentos (PagSeguro/MercadoPago)
- [ ] Envio de emails transacionais (Resend)
- [ ] Job automático de verificação de qualificação mensal

### P1 - High Priority
- [ ] Relatórios exportáveis (PDF/Excel)
- [ ] Ranking de revendedores
- [ ] Sistema de metas e bonificações
- [ ] Notificações push/email
- [ ] Histórico detalhado de comissões

### P2 - Medium Priority
- [ ] Sistema de tickets/suporte
- [ ] Chat entre supervisor e revendedor
- [ ] Calculadora de frete real (Correios/Transportadoras)
- [ ] Integração com ERP
- [ ] App mobile (React Native)

## Next Tasks List
1. Implementar página de Checkout completa
2. Ativar integração real com PagSeguro
3. Ativar integração real com MercadoPago
4. Configurar envio de emails com Resend
5. Criar job de verificação mensal de qualificações
6. Adicionar mais relatórios no dashboard admin

## Technical Debt
- Otimizar queries de árvore de rede (usar $graphLookup)
- Adicionar cache para estatísticas do dashboard
- Implementar rate limiting nas APIs públicas
- Adicionar testes automatizados

---
*Last updated: February 18, 2026*
