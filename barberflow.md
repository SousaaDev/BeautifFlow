# 💅 BeautyFlow SaaS — Documentação Unificada de Contexto para IA

> **Versão:** Enterprise Edition — Documento consolidado para ingestão por modelos de linguagem  
> **Propósito:** Servir como contexto técnico e de negócio completo para IA gerenciar, expandir e tomar decisões sobre o sistema BeautyFlow.

---

## 📌 1. VISÃO EXECUTIVA

O **BeautyFlow** é uma plataforma SaaS vertical **multi-tenant de alta disponibilidade**, projetada para transformar salões de beleza e lojas de serviços estéticos em operações orientadas a dados. O sistema fecha o ciclo de vida completo do cliente: do **atrair** (marketing/bot) ao **reter** (automação/CRM) ao **monetizar** (assinaturas recorrentes).

### 🎯 Proposta de Valor

> Aumentar o faturamento do salão de beleza através de automação, dados e comunicação inteligente — tornando o software indispensável para a saúde financeira do negócio.

### Diferencial Competitivo

- Sistema Operacional completo do salão (não apenas agenda)
- Motor de retenção ativo via WhatsApp
- Receita recorrente para o salão via assinaturas de clientes
- Inteligência analítica via chatbot do gerenciador
- Multi-tenant com isolamento total de dados por unidade

---

## 🧠 2. ANÁLISE DE PROBLEMAS DO MERCADO

### Problemas Operacionais
- Agenda desorganizada, overbooking ou horários vazios
- Falta de controle de tempo entre atendimentos

### Problemas Financeiros
- Falta de controle de entrada/saída
- Mistura de dinheiro pessoal e da empresa
- Sem visibilidade de comissões e margens reais

### Problemas de Retenção
- Clientes não retornam sem estímulo ativo
- Ausência de follow-up automatizado pós-atendimento

### Problemas Comerciais
- Baixa venda de produtos e serviços complementares
- Falta de estratégia de upsell e cross-sell
- Nenhuma oferta de produto/serviço de receita recorrente (assinaturas)

### Problemas Estratégicos
- Dono não tem dados para tomar decisões
- Sem visibilidade de churn, LTV ou MRR

---

## 🏗️ 3. ARQUITETURA DE SISTEMA (HIGH-LEVEL)

### 3.1 Topologia da Solução

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| **Apresentação Web** | Next.js + TailwindCSS + Shadcn/UI | Dashboard admin, PDV, gestão |
| **Apresentação Mobile** | Futuro roadmap | App cliente |
| **Apresentação Conversacional** | WhatsApp API | Chatbot cliente e dono |
| **API Layer** | Node.js (TypeScript) — Arquitetura Hexagonal | Lógica de negócio desacoplada de provedores |
| **Data Layer** | PostgreSQL + Redis | Fonte da verdade + cache/filas/locks |
| **Worker Layer** | Background workers | Automações, mensageria, relatórios pesados |
| **Integrações** | WhatsApp API, Stripe/Asaas/MercadoPago | Comunicação e pagamentos |

### 3.2 Padrões Arquiteturais

- **Hexagonal (Ports & Adapters):** Desacopla lógica de negócio de provedores externos
- **Event-Driven / Observer:** Eventos de domínio disparam automações encadeadas
- **Multi-tenant:** Isolamento por `tenant_id` indexado ou esquemas separados no PostgreSQL
- **Row-Level Security (RLS):** Garantia em nível de banco que um tenant não acessa dados de outro

### 3.3 Componentes de Infraestrutura

- **PostgreSQL:** Fonte da verdade com suporte ACID
- **Redis:** Cache de sessão de chatbot, filas de mensageria, locks distribuídos (prevenção de double-booking)
- **Workers:** Disparos assíncronos de automações e geração de relatórios pesados
- **PITR (Point-in-time recovery):** Backup contínuo ativado

---

## 🗄️ 4. ARQUITETURA DE DADOS — DOMÍNIOS E SCHEMA COMPLETO

### 4.1 Dicionário de Entidades

| Entidade | Descrição | Campos-Chave |
|---|---|---|
| `tenants` (beauty_shops) | Unidade de negócio isolada | `id`, `slug`, `trial_ends_at`, `business_hours (JSONB)` |
| `customers` | Clientes do salão | `id`, `tenant_id`, `name`, `phone`, `tags`, `last_visit` |
| `professionals` | Profissionais cadastrados (terapeutas, esteticistas) | `id`, `tenant_id`, `name`, `commission_rate` |
| `services` | Serviços oferecidos (corte, cílios, massagem, etc.) | `id`, `tenant_id`, `name`, `duration_minutes`, `price`, `commission_rate` |
| `appointments` | Agendamentos (recurso mais disputado) | `id`, `customer_id`, `professional_id`, `service_id`, `start_time`, `end_time`, `status`, `internal_notes` |
| `products` | Produtos para venda/estoque | `id`, `tenant_id`, `name`, `current_stock`, `min_threshold`, `cost_price`, `sale_price` |
| `sales` | Vendas realizadas (PDV) | `id`, `tenant_id`, `customer_id`, `professional_id`, `total`, `payment_method`, `created_at` |
| `sale_items` | Itens de cada venda | `id`, `sale_id`, `product_id`, `service_id`, `quantity`, `unit_price` |
| `transactions` | Fluxo de caixa detalhado | `id`, `tenant_id`, `type (IN/OUT)`, `category`, `payment_method`, `amount`, `metadata` |
| `automations` | Regras do motor de retenção | `id`, `tenant_id`, `trigger`, `condition`, `action`, `is_active` |
| `messages` | Log de mensagens enviadas | `id`, `tenant_id`, `customer_id`, `channel`, `content`, `sent_at`, `status` |
| `loyalty_points` | Saldo de fidelidade por cliente | `id`, `customer_id`, `points`, `updated_at` |
| `membership_plans` | Planos de assinatura do salão | `id`, `tenant_id`, `name`, `price`, `billing_cycle`, `services_included (JSONB)` |
| `subscriptions` | Assinaturas ativas dos clientes | `id`, `customer_id`, `plan_id`, `status`, `current_period_start`, `current_period_end`, `external_subscription_id` |

### 4.2 DDL Completo (SQL)

```sql
-- Extensão para performance em buscas geográficas (opcional)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Salões de Beleza (tenants)
CREATE TABLE beauty_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  trial_ends_at TIMESTAMP,
  business_hours JSONB, -- Ex: {"mon": "09:00-19:00", "sun": "closed"}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Clientes
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(200),
  tags TEXT[],
  last_visit TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Profissionais (Terapeutas, Esteticistas)
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  buffer_minutes INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true
);

-- Serviços
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  name VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true
);

-- Agendamentos
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  customer_id UUID REFERENCES customers(id),
  professional_id UUID REFERENCES professionals(id),
  service_id UUID REFERENCES services(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  internal_notes TEXT,
  price_charged DECIMAL(10,2), -- pode ser R$0,00 se assinante coberto pelo plano
  created_at TIMESTAMP DEFAULT NOW()
);

-- Produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  name VARCHAR(200) NOT NULL,
  current_stock INTEGER DEFAULT 0,
  min_threshold INTEGER DEFAULT 5,
  cost_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true
);

-- Vendas (PDV)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  customer_id UUID REFERENCES customers(id),
  professional_id UUID REFERENCES professionals(id),
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Itens de venda
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  product_id UUID REFERENCES products(id),
  service_id UUID REFERENCES services(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL
);

-- Transações financeiras
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  type VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
  category VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  reference_id UUID, -- sale_id ou appointment_id relacionado
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Automações
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  name VARCHAR(200),
  trigger VARCHAR(100), -- ex: 'last_visit_gt_days'
  condition JSONB,       -- ex: {"days": 20, "tags": ["VIP"]}
  action VARCHAR(100),   -- ex: 'send_whatsapp'
  action_payload JSONB,  -- ex: {"template": "reactivation_vip"}
  is_active BOOLEAN DEFAULT true
);

-- Mensagens enviadas
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(20) DEFAULT 'whatsapp',
  content TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent'
);

-- Pontos de fidelidade
CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Planos de assinatura
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  name VARCHAR(100) NOT NULL,          -- Ex: "VIP Pass", "Pacote Ilimitado"
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'yearly')),
  services_included JSONB,             -- Ex: {"corte_cabelo": "unlimited", "cilios": 2}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assinaturas ativas
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  status VARCHAR(20) CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  external_subscription_id VARCHAR(255), -- ID no Stripe/Asaas/MercadoPago
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⚙️ 5. MOTORES DE REGRA (CORE ENGINES)

### 5.1 Motor de Agendamento (High-Precision Scheduling)

**Validação de Conflito de Slot:**
```sql
-- Antes de confirmar, verificar interseção de tempo
SELECT id FROM appointments
WHERE professional_id = :professional_id
  AND status NOT IN ('cancelled')
  AND (start_time, end_time) OVERLAPS (:requested_start, :requested_end);
-- Se retornar qualquer linha → slot indisponível
```

**Regras de negócio:**
- Buffer Time configurável por profissional (default: 10 min) adicionado automaticamente ao `end_time`
- Não permitir agendamentos fora do `business_hours` do tenant
- Lock distribuído via Redis ao confirmar agendamento (prevenção de race condition)
- Agendamentos de assinante: `price_charged = 0.00` se serviço coberto pelo plano

### 5.2 Motor de Automação (Event-Driven / Observer)

**Estrutura de regra:**
```json
{
  "trigger": "last_visit_gt_days",
  "condition": { "days": 20, "tags": ["VIP"] },
  "action": "send_whatsapp",
  "action_payload": {
    "template": "reactivation_vip_coupon",
    "discount_percent": 15
  }
}
```

**Tipos de automação suportados:**

| Tipo | Trigger | Ação |
|---|---|---|
| Reativação | `last_visit > N dias` | Enviar mensagem de retorno |
| Pós-atendimento | `APPOINTMENT_COMPLETED` | Enviar avaliação / obrigado |
| Promoção segmentada | `tag == 'VIP'` + data | Enviar cupom |
| Inadimplência | `subscription.status = 'past_due'` | Enviar link de pagamento |
| Aniversário | `customer.birthday == today` | Enviar oferta especial |
| Estoque crítico | `product.current_stock <= min_threshold` | Alertar dono |

---

## 🔗 6. FLUXO DE EVENTOS (EVENT-DRIVEN FLOW)

### Eventos principais do sistema

```
APPOINTMENT_CREATED   → validar_slot → confirmar → notificar_cliente
APPOINTMENT_COMPLETED → trigger_retention → trigger_loyalty_points
SALE_COMPLETED        → update_stock → update_finance → update_crm
STOCK_UPDATED         → check_min_threshold → alert_if_low
SUBSCRIPTION_CREATED  → ativar_plano → notificar_cliente
PAYMENT_FAILED        → set_past_due → send_payment_link_whatsapp
```

### Exemplo de cadeia completa — Venda no PDV

```
SALE_COMPLETED
  → sale_items.forEach(item → update_stock(item.product_id, -item.quantity))
  → insert_transaction(type='IN', amount=sale.total)
  → update_customer.last_visit = NOW()
  → award_loyalty_points(customer_id, sale.total)
  → trigger_automations(event='SALE_COMPLETED', customer_id)
```

---

## 🧩 7. MÓDULOS DETALHADOS

### 📅 7.1 Agenda (Scheduling Engine)

**Funcionalidades:**
- CRUD completo de agendamentos
- Suporte a múltiplos profissionais simultâneos
- Serviços com duração variável
- Visualização por dia/semana/profissional
- Arraste e solte (drag & drop) — Milestone Beta
- Lembretes automáticos 2h e 24h antes via WhatsApp

**Estados de agendamento:** `scheduled → completed | cancelled | no_show`

---

### 👥 7.2 CRM de Clientes

**Funcionalidades:**
- Histórico completo de visitas e compras
- Segmentação por tags (VIP, inativo, aniversariante, etc.)
- Frequência média de retorno
- LTV (Lifetime Value) calculado
- Filtros avançados para campanhas

**Métricas derivadas por cliente:**
- `LTV = soma de todas as vendas históricas`
- `frequencia_media = total_visitas / meses_como_cliente`
- `dias_desde_ultima_visita = NOW() - last_visit`

---

### 🔁 7.3 Motor de Retenção (Core Differentiator)

O motor executa periodicamente (cron job ou event trigger) verificando condições nas regras cadastradas e disparando ações automatizadas.

**Fluxo de execução:**
1. Worker busca automações ativas do tenant
2. Avalia condição contra base de clientes
3. Filtra clientes que atendem à condição
4. Dispara ação (mensagem, notificação, cupom)
5. Registra em `messages` para auditoria e evitar reenvio duplicado

---

### 💰 7.4 Módulo Financeiro

**Entradas registradas:**
- Serviços realizados
- Produtos vendidos
- Receita de assinaturas (MRR)

**Saídas registradas:**
- Comissões de profissionais
- Custos operacionais
- Reposição de estoque

**Relatórios disponíveis:**
- DRE Simplificado (Receita − Custos = Lucro)
- Fluxo de Caixa por período
- Comissões por profissional
- MRR (Monthly Recurring Revenue) de assinaturas

**Regra de comissão:**
- Calculada por serviço individual com `commission_rate` própria
- Taxas de cartão deduzidas antes do cálculo de comissão (split lógico)
- Assinaturas: profissional recebe comissão sobre valor base do plano, mesmo que o agendamento seja R$ 0,00 para o cliente

---

### 📦 7.5 Estoque Inteligente

**Operações:**
- Entrada manual (compra de mercadoria)
- Saída automática ao concluir venda no PDV
- Alertas de estoque mínimo (`current_stock <= min_threshold`)

**Regras:**
- Cada item vendido decrementa `current_stock`
- Se `current_stock = 0`, produto bloqueado para venda
- Alerta enviado ao dono via WhatsApp e dashboard

---

### 🛒 7.6 PDV (Ponto de Venda)

**Fluxo de venda:**
1. Selecionar cliente (ou criar novo)
2. Adicionar serviços realizados
3. Adicionar produtos vendidos
4. Escolher método de pagamento
5. Finalizar venda

**Efeitos disparados:**
- `update_stock` para cada produto vendido
- `insert_transaction` no financeiro
- `update_customer.last_visit`
- `award_loyalty_points`
- Trigger do motor de retenção pós-venda

---

### 🎯 7.7 Programa de Fidelidade

**Modelos suportados:**
- **Pontos:** Acumula pontos a cada visita/compra, resgata por serviços/produtos
- **Cashback:** Percentual da venda vira crédito para próxima visita

**Tabela:** `loyalty_points` com saldo por customer + tenant

---

### 📊 7.8 Analytics & Dashboard

**Métricas do dashboard principal:**
- Receita total do período
- Ticket médio por cliente
- Taxa de retenção (% clientes que retornaram)
- MRR (receita de assinaturas)
- Novos clientes vs. recorrentes
- Ranking de serviços mais vendidos
- Ranking de profissionais por faturamento
- Churn de assinantes do mês

---

## 💳 8. MÓDULO DE ASSINATURAS (BEAUTY SUBSCRIPTIONS)

Este módulo permite que o salão venda **planos de serviços recorrentes**, gerando **MRR previsível** e aumentando a retenção de clientes.

### 8.1 Modelos de Plano (Exemplos)

| Plano | Incluso | Modelo |
|---|---|---|
| **Basic** | 2 cortes de cabelo/mês | Recorrente mensal |
| **Premium** | Corte + Hidratação + Escova + 1 cílios/mês | Recorrente mensal |
| **Deluxe** | Corte + Tingimento + Massagem + Cílios + Desconto em produtos | Anual |
| **VIP** | Tudo ilimitado + prioridade de agendamento + kit produtos | Recorrente mensal |

### 8.2 Schema de Assinaturas

```sql
-- Planos oferecidos pelo salão
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES beauty_shops(id),
  name VARCHAR(100),
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'yearly')),
  services_included JSONB, -- Ex: {"corte_cabelo": "unlimited", "cilios": 2, "massagem": "1x/mês"}
  is_active BOOLEAN DEFAULT true
);

-- Assinaturas ativas dos clientes
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  tenant_id UUID REFERENCES beauty_shops(id),
  plan_id UUID REFERENCES membership_plans(id),
  status VARCHAR(20) CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  external_subscription_id VARCHAR(255) -- ID no Stripe/Asaas/MercadoPago
);
```

### 8.3 Lógica de Check-out e Validação de Uso

**Fluxo de assinatura:**
1. Cliente assina pelo WebApp ou link do WhatsApp
2. Sistema integra com gateway (Stripe ou Asaas) para cobrança recorrente
3. `subscriptions.status` fica como `active`

**Validação na agenda:**
```
ao_agendar(customer_id, service_id):
  subscription = buscar_assinatura_ativa(customer_id)
  if subscription.status == 'active':
    plano = buscar_plano(subscription.plan_id)
    if service_id IN plano.services_included:
      if plano.services_included[service_id] == 'unlimited':
        price_charged = 0.00  # coberto pelo plano
      elif saldo_mensal(customer_id, service_id) > 0:
        price_charged = 0.00  # dentro do limite mensal
        decrementar_saldo(customer_id, service_id)
      else:
        cobrar_preco_normal()
    else:
      cobrar_preco_normal()
  else:
    cobrar_preco_normal()
```

### 8.4 Regras de Negócio de Assinaturas

| Regra | Comportamento |
|---|---|
| **Inadimplência** | Cartão recusado → `status = 'past_due'` → Bot envia link de pagamento → Bloqueio de agendamento pelo plano |
| **Upgrade** | Mudança para plano superior → cobra proporcional (prorata) |
| **Downgrade** | Mudança para plano inferior → efetivo no próximo ciclo |
| **Cancelamento** | `status = 'cancelled'` → acesso até fim do período pago |
| **Trial** | `status = 'trialing'` → acesso liberado sem cobrança por N dias |
| **Comissão do profissional** | Calculada sobre valor base do plano, independente do `price_charged` ao cliente |

---

## 🤖 9. ECOSSISTEMA CONVERSACIONAL (CHATBOTS)

### 9.1 Chatbot do Cliente (State Machine + NLU)

**Arquitetura em camadas:**
- **Nível 1 (Fluxo):** Menu com botões para agendamento rápido
- **Nível 2 (IA - futuro):** NLU para interpretar linguagem natural

**Máquina de estados:**
```
START → SERVICE_SELECTION → PROFESSIONAL_SELECTION → TIME_SELECTION → CONFIRM → BOOKED
                                                                       ↓
                                                              REMINDER_24H → REMINDER_2H
```

**Exemplo de fluxo — agendamento:**
```
User: "quero cortar cabelo"
Bot:  "Qual serviço? [Corte] [Corte + Cílios] [Escova] [Tingimento]"
User: [Corte]
Bot:  "Com qual profissional? [Ana] [Maria] [Qualquer uma]"
User: [Ana]
Bot:  "Horários disponíveis para Ana amanhã: [10:00] [14:00] [16:30]"
User: [14:00]
Bot:  "Confirma: Corte com Ana, amanhã às 14h? [Sim] [Não]"
User: [Sim]
Bot:  "Agendado! 🎉 Localização: [Maps Link]. Até amanhã!"
```

**Fluxo adicional — assinante:**
```
Bot: "Olá, Felipe! 👋 Você é nosso assinante VIP.
      Deseja usar seu plano para agendar um corte agora?"
```

**Fluxo adicional — upsell de assinatura:**
```
Bot: "Você gastou R$ 120 nos últimos 2 meses.
      Com nosso Plano Premium (R$ 99/mês), você tem serviços ilimitados.
      Quer assinar agora? [Sim, quero!] [Ver detalhes] [Agora não]"
```

**Integrações do chatbot cliente:**
- Envio de localização (Google Maps)
- Lembretes 24h e 2h antes do horário
- Link de pagamento para assinatura
- Avaliação pós-atendimento

### 9.2 Chatbot do Dono (Business Intelligence)

**Stack:** LangChain + SQL Agent

**Capacidade:** Transforma linguagem natural em queries SQL executadas em tempo real contra os dados do tenant.

**Exemplos de queries suportadas:**

| Pergunta do Dono | Query Gerada |
|---|---|
| "Quanto faturei hoje?" | `SELECT SUM(total) FROM sales WHERE tenant_id = :tid AND DATE(created_at) = CURRENT_DATE` |
| "Quem é meu melhor cliente do mês?" | `SELECT customer_id, SUM(total) FROM sales WHERE tenant_id = :tid AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) GROUP BY customer_id ORDER BY SUM(total) DESC LIMIT 1` |
| "Qual serviço mais vendeu essa semana?" | `SELECT service_id, COUNT(*) FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.tenant_id = :tid AND s.created_at >= NOW() - INTERVAL '7 days' GROUP BY service_id ORDER BY COUNT(*) DESC` |
| "Lucro líquido descontando comissões da semana?" | Query composta: receita − comissões calculadas por profissional |
| "Quantos assinantes perdi esse mês?" | `SELECT COUNT(*) FROM subscriptions WHERE tenant_id = :tid AND status = 'cancelled' AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())` |

**Segurança:** Acesso restrito via autenticação de número de telefone vinculado ao perfil `OWNER`. Queries sempre filtradas por `tenant_id` para garantir isolamento.

---

## 🔌 10. API REST — ENDPOINTS COMPLETOS

### Autenticação
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
```

### Tenants
```
POST   /tenants              (signup de novo salão de beleza)
GET    /tenants/:id
PUT    /tenants/:id
```

### Customers
```
GET    /customers            (com filtros: tag, last_visit, etc.)
POST   /customers
GET    /customers/:id
PUT    /customers/:id
DELETE /customers/:id        (soft delete / anonimização LGPD)
GET    /customers/:id/history
```

### Professionals
```
GET    /professionals
POST   /professionals
PUT    /professionals/:id
GET    /professionals/:id/availability?date=YYYY-MM-DD
```

### Services
```
GET    /services
POST   /services
PUT    /services/:id
```

### Appointments
```
GET    /appointments         (com filtros: professional_id, date, status)
POST   /appointments
GET    /appointments/:id
PUT    /appointments/:id
DELETE /appointments/:id     (cancela)
```

### Sales (PDV)
```
POST   /sales                (cria venda, dispara todos os efeitos colaterais)
GET    /sales                (com filtros: data, professional_id)
GET    /sales/:id
```

### Products & Inventory
```
GET    /products
POST   /products
PUT    /products/:id
POST   /products/:id/stock-entry   (entrada de estoque)
```

### Financial
```
GET    /transactions         (com filtros: type, category, período)
POST   /transactions         (lançamento manual)
GET    /reports/dre?period=
GET    /reports/cashflow?period=
GET    /reports/commissions?period=
GET    /reports/mrr
```

### Automations
```
GET    /automations
POST   /automations
PUT    /automations/:id
DELETE /automations/:id
```

### Memberships & Subscriptions
```
GET    /membership-plans
POST   /membership-plans
PUT    /membership-plans/:id
GET    /subscriptions
GET    /subscriptions/:customer_id
POST   /subscriptions        (assinar plano)
PUT    /subscriptions/:id    (upgrade/downgrade/cancelar)
GET    /subscriptions/:id/usage  (consumo do período)
```

### Analytics
```
GET    /analytics/overview?period=
GET    /analytics/retention
GET    /analytics/churn
GET    /analytics/top-customers
GET    /analytics/top-services
```

---

## 🔐 11. SEGURANÇA & COMPLIANCE

### Autenticação e Autorização
- **JWT Auth** com refresh tokens
- **Roles:** `OWNER`, `PROFESSIONAL`, `RECEPTIONIST`, `CUSTOMER` (chatbot)
- Cada role tem escopo de acesso restrito a seus endpoints

### Multi-tenancy
- Toda query obrigatoriamente filtrada por `tenant_id`
- **Row-Level Security (RLS)** no PostgreSQL como segunda linha de defesa
- Nenhum dado de um tenant é acessível por outro

### LGPD
- Módulo de **anonimização de dados** de clientes após X anos de inatividade
- Endpoint `DELETE /customers/:id` executa soft delete com anonimização
- Logs de consentimento armazenados

### Infraestrutura
- PITR (Point-in-time recovery) no banco de dados
- Locks distribuídos via Redis para operações críticas (agendamentos, cobranças)
- Dados sensíveis (tokens de pagamento) nunca armazenados localmente — referenciados via `external_subscription_id`

---

## 🚀 12. ROADMAP TÉCNICO COMPLETO

### Milestone Alpha — MVP Core
- [ ] Auth JWT + Multi-tenant setup
- [ ] CRUD Clientes e Serviços
- [ ] CRUD Profissionais com disponibilidade
- [ ] API de Agendamento com validação de conflito
- [ ] Motor de retenção básico (manual)

### Milestone Beta — Operação Completa
- [ ] Calendário interativo com Drag & Drop
- [ ] Integração WhatsApp (Baileys / Evolution API)
- [ ] Chatbot cliente — State Machine completa
- [ ] Lembretes automáticos 24h e 2h
- [ ] PDV básico

### Milestone Gamma — Financeiro & Estoque
- [ ] Dashboards financeiros (DRE, Fluxo de Caixa)
- [ ] Gestão de Estoque com alertas
- [ ] Motor de Fidelidade (pontos/cashback)
- [ ] Motor de Automações (Event-Driven completo)
- [ ] PDV avançado com estoque integrado

### Milestone Delta — Assinaturas & IA
- [ ] Módulo de Memberships (Planos de Assinatura)
- [ ] Integração Gateway de Pagamento (Stripe / Asaas / MercadoPago)
- [ ] Cobrança recorrente e gestão de inadimplência
- [ ] Chatbot do Dono com SQL Agent (LangChain)
- [ ] Chatbot cliente com NLU (intenções em linguagem natural)
- [ ] Relatórios de MRR, Churn e projeções

### Milestone Epsilon — Escala
- [ ] App mobile para clientes
- [ ] Marketplace de salões de beleza (busca geográfica)
- [ ] Integração com franquias (multi-unidade)
- [ ] APIs públicas para integrações de terceiros

---

## 💰 13. MODELO DE NEGÓCIO

### Monetização da Plataforma (B2B — Salão paga o SaaS)

| Plano SaaS | Funcionalidades | Público-alvo |
|---|---|---|
| **Starter** | Agenda + CRM básico | Salão pequeno (1-2 profissionais) |
| **Pro** | Tudo + Financeiro + Estoque + Automações | Salões estabelecidos |
| **Enterprise** | Tudo + Assinaturas + BI + Multi-unidade | Franquias e redes de salões |

### Receita do Salão (B2C — Cliente do salão paga assinatura)
- O salão vende planos de assinatura para seus clientes
- O BeautyFlow facilita a recorrência e cobra taxa sobre o volume processado (modelo marketplace) ou inclui no plano Pro/Enterprise

---

## 📈 14. ESTRATÉGIA DE ESCALA

- **Nicho inicial:** Salões de beleza independentes
- **Expansão:** Redes e franquias de salões (multi-unidade, dashboard consolidado)
- **Expansão geográfica:** Brasil → LATAM
- **Modelo de indicação:** Profissional que indicar novo cliente da plataforma recebe benefício

---

## 📌 15. GLOSSÁRIO TÉCNICO

| Termo | Definição |
|---|---|
| `tenant_id` | Identificador único do salão de beleza no sistema multi-tenant |
| `MRR` | Monthly Recurring Revenue — receita previsível de assinaturas |
| `LTV` | Lifetime Value — valor total gerado por um cliente |
| `past_due` | Status de assinatura com pagamento em atraso |
| `buffer_time` | Tempo de folga entre atendimentos do profissional |
| `commission_rate` | Percentual de comissão do profissional sobre o serviço |
| `services_included` | JSONB com mapa de serviços e limites de uso do plano |
| `external_subscription_id` | ID da assinatura no gateway de pagamento externo |
| `churn` | Taxa de cancelamento de assinantes no período |
| `RLS` | Row-Level Security — segurança a nível de linha no PostgreSQL |
| `PITR` | Point-in-time Recovery — backup contínuo do banco |

---

> **ℹ️ Nota para a IA:** Este documento representa o estado completo e consolidado do sistema BeautyFlow. Ao receber perguntas ou tarefas relacionadas a este sistema, considere todos os módulos como interdependentes. Alterações em um módulo (ex: Agendamentos) possuem efeitos em cascata sobre Financeiro, Estoque, CRM e Motor de Retenção. O `tenant_id` é obrigatório em todas as operações de dados. Priorize sempre isolamento de dados, consistência transacional e disparo de eventos ao propor soluções.