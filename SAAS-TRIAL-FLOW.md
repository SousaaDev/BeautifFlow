# 💳 BeautyFlow SaaS — Trial & Pagamento (Fluxo Completo)

> **Modelo:** Freemium com Trial de 3 horas  
> **Propósito:** Documentar o fluxo de onboarding, trial e cobrança  
> **Data:** Maio 2026

---

## 📊 Fluxo Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOVO PROPRIETÁRIO (OWNER)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  SignUp Page     │
                    │  /auth/signup    │
                    │  (Email, Senha)  │
                    └────────┬─────────┘
                             │ POST /auth/register
                             ▼
              ┌──────────────────────────────────┐
              │  Tenant Criado + Trial Iniciado  │
              │                                  │
              │  trial_ends_at = NOW() + 3h      │
              │  status = "TRIALING"             │
              │  plan = null (sem plano pago)    │
              └────────┬─────────────────────────┘
                       │
                       ▼
            ┌─────────────────────────┐
            │  Dashboard Completo     │
            │  (3 horas de acesso)    │
            │                         │
            │ ✅ Adicionar clientes   │
            │ ✅ Criar agendamentos   │
            │ ✅ Configurar serviços  │
            │ ✅ Tudo liberado!       │
            └────────┬────────────────┘
                     │
         ┌───────────┴───────────┐
         │    3 HORAS PASSARAM   │
         └───────────┬───────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │   BLOQUEIO AUTOMÁTICO          │
    │                                │
    │ ❌ Dashboard trava            │
    │ ❌ APIs retornam 403 FORBIDDEN│
    │ ❌ "Seu trial expirou!"       │
    │ ❌ Redireciona para /paywall  │
    └────────┬─────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │   PÁGINA DE PAGAMENTO/PAYWALL  │
    │   /dashboard/billing           │
    │                                │
    │  Planos disponíveis:           │
    │  🟢 Starter - R$ 29,90/mês        │
    │  🔵 Pro - R$/mês           │
    │  🟣 Enterprise - R$ 50,90/mês    │
    │                                │
    │  [Escolher Plano] → Stripe     │
    └────────┬─────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │   CHECKOUT STRIPE              │
    │   (Cartão de crédito)          │
    └────────┬─────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   Sucesso      Falha
      │             │
      ▼             ▼
  ┌────────┐   ┌──────────┐
  │ Paga!  │   │ Tenta    │
  └───┬────┘   │ novamente│
      │        └──────────┘
      │
      ▼
┌──────────────────────────────────┐
│  Assinatura Ativa                │
│                                  │
│  tenants.status = "ACTIVE"       │
│  tenants.plan = "pro"            │
│  tenants.trial_ends_at = null    │
│  tenants.subscription_ends_at =  │
│    NOW() + 30 dias (renova)      │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Dashboard 100% LIBERADO!        │
│  (Até próxima cobrança)          │
│                                  │
│  ✅ Clientes ilimitados          │
│  ✅ Agendamentos ilimitados      │
│  ✅ Relatórios completos         │
│  ✅ Tudo funcionando             │
└──────────────────────────────────┘


┌─────────────────────────────────────┐
│  CENÁRIO: NÃO PAGA APÓS 30 DIAS    │
└─────────────────────────────────────┘
                │
      trial_ends_at + 30 dias
                │
                ▼
      ┌──────────────────────┐
      │  Job Agendado roda   │
      │  (CRON job)          │
      │                      │
      │  Verifica:           │
      │  - trial_ends_at?    │
      │  - subscription?     │
      │  - status = TRIALING │
      └────────┬─────────────┘
               │
      Sem pagamento há 30+ dias
               │
               ▼
      ┌──────────────────────┐
      │  DELETE CASCADE      │
      │                      │
      │  ❌ Tenant deletado  │
      │  ❌ Todos os dados   │
      │  ❌ Clientes         │
      │  ❌ Agendamentos     │
      │  ❌ TUDO APAGADO     │
      └──────────────────────┘
```

---

## 🎯 Estados do Tenant

| Estado | Descrição | Acesso | trial_ends_at | subscription_id |
|---|---|---|---|---|
| **TRIALING** | Trial ativo (3h) | ✅ Completo | NOW() + 3h | null |
| **TRIAL_EXPIRED** | Trial expirado, sem pagamento | ❌ Bloqueado | Passado | null |
| **ACTIVE** | Assinatura paga | ✅ Completo | null | stripe_sub_123 |
| **PAST_DUE** | Pagamento atrasado | ⚠️ Limitado | null | stripe_sub_123 |
| **CANCELLED** | Cancelado pelo owner | ❌ Bloqueado | null | stripe_sub_123 |
| **DELETED** | Deletado (300+ dias sem pagar) | ❌ Deletado | null | null |

---

## 🗄️ Schema de Banco (Alterações)

### Tabela `beauty_shops` (tenants)

```sql
ALTER TABLE beauty_shops ADD COLUMN (
  status VARCHAR(50) DEFAULT 'TRIALING',
  -- TRIALING | TRIAL_EXPIRED | ACTIVE | PAST_DUE | CANCELLED | DELETED
  
  trial_ends_at TIMESTAMP,
  -- Quando o trial de 3h termina
  
  subscription_id VARCHAR(255),
  -- ID da assinatura no Stripe (stripe_sub_...)
  
  subscription_ends_at TIMESTAMP,
  -- Quando a assinatura atual termina (próxima cobrança)
  
  plan VARCHAR(50),
  -- starter | pro | enterprise
  
  payment_method_id VARCHAR(255),
  -- ID do cartão no Stripe
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  deleted_at TIMESTAMP
  -- Para soft delete
);

-- Índices importantes
CREATE INDEX idx_beauty_shops_status ON beauty_shops(status);
CREATE INDEX idx_beauty_shops_trial_ends_at ON beauty_shops(trial_ends_at);
CREATE INDEX idx_beauty_shops_subscription_ends_at ON beauty_shops(subscription_ends_at);
```

---

## 🔌 Endpoints Novos/Alterados

### Auth - Registro com Trial

#### `POST /auth/register` — Novo Tenant + Trial
**Request:**
```json
{
  "email": "dono@salao.com",
  "password": "senha123",
  "tenantName": "Salão da Maria",
  "slug": "salao-maria",
  "businessHours": {
    "monday": "09:00-18:00",
    "tuesday": "09:00-18:00"
  }
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiI...",
  "user": {
    "id": "user-123",
    "email": "dono@salao.com",
    "role": "OWNER"
  },
  "tenant": {
    "id": "tenant-456",
    "name": "Salão da Maria",
    "status": "TRIALING",
    "trial_ends_at": "2024-05-15T18:30:00Z",
    "trial_hours_remaining": 3,
    "plan": null
  }
}
```

**Backend Logic:**
```typescript
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, tenantName, slug, businessHours } = req.body;
    
    // 1. Criar usuário
    const user = await userRepository.create({ email, password, role: 'OWNER' });
    
    // 2. Criar tenant com trial
    const trialEndsAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // NOW() + 3h
    const tenant = await tenantRepository.create({
      name: tenantName,
      slug,
      businessHours,
      status: 'TRIALING',
      trial_ends_at: trialEndsAt,
      created_at: new Date(),
    });
    
    // 3. Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // 4. Agendar job para bloquear após 3h
    scheduleTrialExpiration(tenant.id, trialEndsAt);
    
    // 5. Agendar job para deletar após 300 dias se não pagar
    scheduleAccountDeletion(tenant.id, trialEndsAt);
    
    res.status(201).json({ token, user, tenant });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

---

### Trial Middleware — Bloquear Após 3h

#### `middleware/trial-check.ts` — Validar Trial Ativo

```typescript
export const trialGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.params.tenantId || req.body.tenantId;
    const tenant = await tenantRepository.findById(tenantId);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Se está em trial, verificar se expirou
    if (tenant.status === 'TRIALING') {
      if (new Date() > new Date(tenant.trial_ends_at)) {
        // Trial expirou!
        await tenantRepository.update(tenantId, { status: 'TRIAL_EXPIRED' });
        
        return res.status(403).json({
          error: 'Trial expired',
          message: 'Seu período de teste de 3 horas expirou. Por favor, escolha um plano e pague.',
          redirect: `/dashboard/billing?tenantId=${tenantId}`,
        });
      }
    }
    
    // Se está em TRIAL_EXPIRED e não tem subscription ativa
    if (tenant.status === 'TRIAL_EXPIRED' && !tenant.subscription_id) {
      return res.status(403).json({
        error: 'Trial expired - no active subscription',
        redirect: `/dashboard/billing?tenantId=${tenantId}`,
      });
    }
    
    // Se está em PAST_DUE (pagamento atrasado), permitir com aviso
    if (tenant.status === 'PAST_DUE') {
      res.locals.warning = 'Seu pagamento está atrasado. Atualize seu cartão para continuar.';
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Aplicar em todas as rotas do dashboard:**
```typescript
app.use('/api/tenants/:tenantId/*', trialGuard);
```

---

### Pagamento - Criar Plano SaaS (Stripe)

#### `POST /api/billing/plans` — Listar Planos SaaS

```typescript
export const listSaaSPlans = async (req: Request, res: Response) => {
  try {
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: 9900, // R$ 99.00 em centavos
        interval: 'month',
        description: 'Perfeito para salões pequenos',
        features: [
          'Até 5 profissionais',
          'Agenda ilimitada',
          'Até 1000 clientes',
          'Relatórios básicos',
        ],
        stripePriceId: 'price_starter_123', // ID real do Stripe
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29900, // R$ 299.00
        interval: 'month',
        description: 'Para salões estabelecidos',
        features: [
          'Profissionais ilimitados',
          'Agenda ilimitada',
          'Clientes ilimitados',
          'Relatórios avançados',
          'Automações',
          'WhatsApp integrado',
        ],
        stripePriceId: 'price_pro_123',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99900, // R$ 999.00
        interval: 'month',
        description: 'Para redes e franquias',
        features: [
          'Tudo do Pro',
          'Multi-unidade',
          'Gerenciador dedicado',
          'API pública',
          'SLA 99.9%',
        ],
        stripePriceId: 'price_enterprise_123',
      },
    ];
    
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

#### `POST /api/billing/checkout` — Criar Sessão de Checkout

**Request:**
```json
{
  "tenantId": "tenant-456",
  "planId": "pro",
  "successUrl": "http://localhost:3001/dashboard/billing/success",
  "cancelUrl": "http://localhost:3001/dashboard/billing"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**Backend Logic:**
```typescript
export const createCheckout = async (req: Request, res: Response) => {
  try {
    const { tenantId, planId, successUrl, cancelUrl } = req.body;
    
    // 1. Buscar tenant
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // 2. Buscar plano correspondente
    const plan = {
      'starter': 'price_starter_123',
      'pro': 'price_pro_123',
      'enterprise': 'price_enterprise_123',
    }[planId];
    
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // 3. Criar sessão Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: plan,
          quantity: 1,
        },
      ],
      customer_email: tenant.email, // ou buscar do usuário
      metadata: {
        tenantId: tenant.id,
        planId: planId,
      },
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
    });
    
    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

#### `POST /api/webhooks/stripe` — Webhook de Confirmação

**Eventos tratados:**
- `checkout.session.completed` → Assinatura criada com sucesso
- `customer.subscription.updated` → Renovação
- `customer.subscription.deleted` → Cancelamento
- `invoice.payment_failed` → Pagamento recusado

```typescript
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // Atualizar tenant com subscription
      await tenantRepository.update(session.metadata.tenantId, {
        status: 'ACTIVE',
        plan: session.metadata.planId,
        subscription_id: session.subscription,
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        trial_ends_at: null,
      });
      
      // Enviar email de boas-vindas
      await sendEmail({
        to: session.customer_email,
        subject: 'Bem-vindo ao BeautyFlow!',
        template: 'subscription_confirmed',
      });
      
      break;
    
    case 'invoice.payment_failed':
      const invoice = event.data.object;
      
      // Atualizar status para PAST_DUE
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription
      );
      
      await tenantRepository.updateBySubscription(subscription.id, {
        status: 'PAST_DUE',
      });
      
      // Enviar email de alerta
      await sendEmail({
        to: subscription.metadata.customerEmail,
        subject: 'Falha no pagamento - Ação necessária',
        template: 'payment_failed',
      });
      
      break;
  }
  
  res.json({ received: true });
};
```

---

### Background Jobs (CRON)

#### `jobs/trial-expiration.ts` — Bloquear Trial Expirado

```typescript
// Roda a cada 5 minutos
export const checkTrialExpiration = async () => {
  try {
    const expiredTrials = await pool.query(
      `SELECT id FROM beauty_shops 
       WHERE status = 'TRIALING' 
       AND trial_ends_at <= NOW()`
    );
    
    for (const { id } of expiredTrials.rows) {
      await tenantRepository.update(id, {
        status: 'TRIAL_EXPIRED',
      });
      
      console.log(`Trial expired for tenant ${id}`);
    }
  } catch (error) {
    console.error('Error checking trial expiration:', error);
  }
};
```

#### `jobs/account-deletion.ts` — Deletar Conta Após 300 Dias

```typescript
// Roda diariamente
export const checkAccountDeletion = async () => {
  try {
    const tenantToDelete = await pool.query(
      `SELECT id FROM beauty_shops 
       WHERE status = 'TRIAL_EXPIRED' 
       AND subscription_id IS NULL
       AND trial_ends_at <= NOW() - INTERVAL '300 days'`
    );
    
    for (const { id } of tenantToDelete.rows) {
      // DELETE CASCADE apaga tudo relacionado
      await tenantRepository.delete(id);
      
      console.log(`Account deleted: ${id} (no payment after 300 days)`);
    }
  } catch (error) {
    console.error('Error checking account deletion:', error);
  }
};
```

**Registrar jobs no servidor:**
```typescript
// index.ts
import schedule from 'node-schedule';
import { checkTrialExpiration } from './jobs/trial-expiration';
import { checkAccountDeletion } from './jobs/account-deletion';

// Rodar a cada 5 minutos
schedule.scheduleJob('*/5 * * * *', checkTrialExpiration);

// Rodar todo dia às 2 da manhã
schedule.scheduleJob('0 2 * * *', checkAccountDeletion);
```

---

## 🎨 Estilo do App — Design e Identidade

### Direção visual
- Paleta clara e moderna com contraste suave.
- Use gradientes roxos/rosa suaves para páginas de onboarding e pagamento.
- Use branco, cinza claro e azul escuro para telas de dashboard e gestão.
- Elementos de interface com cantos arredondados e sombras leves.
- Layout espaçado, arejado e com cards visuais para métricas e ações.

### Tipografia
- Família principal: fonte sans-serif moderna e legível.
- Hierarquia simples:
  - Títulos grandes e negritados para páginas principais.
  - Subtítulos médios e textos informativos em tons de cinza.
  - Botões e labels com alta legibilidade.

### Componentes-chave
- Botões primários: `bg-blue-600`, texto branco, borda arredondada e hover suave.
- Botões secundários: `bg-gray-100`, texto escuro, borda sutil.
- Banners de alerta:
  - Trial ativo: fundo azul-claro / texto azul escuro.
  - Trial expirado: fundo vermelho-claro / texto vermelho escuro.
  - Pagamento pendente: fundo amarelo-claro / texto amarelo escuro.
- Cards:
  - Usar fundo branco com sombra leve.
  - Incluir ícones de status, título e métricas principais.
- Inputs/fields:
  - Bordas suaves e foco azul.
  - Espaçamento interno generoso.

### Experiência de usuário (UX)
- Fluxo direto e sem ruídos: onboarding, dashboard, cobrança.
- Mensagens claras no trial: "Você tem 3 horas grátis" e contagem regressiva em destaque.
- A página de billing deve ser simples, com comparação de planos e CTA destacado.
- O processo de checkout deve usar Stripe sem exigir campos extras no app.
- Mostrar feedback imediato após ações importantes: cadastro, agendamento, pagamento.

### Tom da comunicação
- Amigável, confiante e simples.
- Usar frases como:
  - "Comece seu salão digital em minutos"
  - "Teste grátis por 3 horas" 
  - "Escolha o plano ideal e continue crescendo"
- Evitar jargão técnico para o dono do salão.

### Layout geral das páginas
- Header limpo com logo, título e call-to-action.
- Seções em cards paralelos para área de métricas, agenda e botões principais.
- Painel lateral leve para atalhos rápidos (agendamentos, clientes, serviços).
- Dashboard com KPIs na parte superior e lista de ações abaixo.
- Billing com grade de planos e selo de plano recomendado.

---

## 📱 Frontend - Páginas Necessárias

### 1️⃣ Signup - Criar Conta com Trial

#### `/auth/signup` — Novo Tenant

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/forms/RegisterForm';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignup = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Signup failed');

      const { token, tenant } = await response.json();

      // Salvar token
      localStorage.setItem('token', token);
      localStorage.setItem('tenantId', tenant.id);

      // Mostrar toast com trial info
      showToast(`🎉 Trial de 3 horas iniciado! Aproveite!`);

      // Redirecionar ao dashboard
      router.push('/dashboard');
    } catch (error) {
      showToast('Erro ao criar conta', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Criar Conta</h1>
        <p className="text-gray-600 mb-6">
          3 horas grátis para testar tudo! 🚀
        </p>

        <RegisterForm onSubmit={handleSignup} isLoading={loading} />

        <p className="text-sm text-center text-gray-500 mt-4">
          Já tem conta? <a href="/auth/login" className="text-blue-600 font-semibold">Login</a>
        </p>
      </div>
    </div>
  );
}
```

---

### 2️⃣ Dashboard - Mostrar Trial Ativo

#### `/dashboard` — Overview com Contador de Trial

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Dashboard() {
  const { tenant } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (tenant?.status === 'TRIALING' && tenant?.trial_ends_at) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(tenant.trial_ends_at).getTime();
        const remaining = end - now;

        if (remaining <= 0) {
          setTimeRemaining('Expirado!');
          clearInterval(interval);
          return;
        }

        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remaining / (1000 * 60)) % 60);
        const seconds = Math.floor((remaining / 1000) % 60);

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [tenant]);

  if (tenant?.status === 'TRIALING') {
    return (
      <div>
        {/* Alert banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <h3 className="text-blue-900 font-bold">⏰ Período de Teste Ativo</h3>
          <p className="text-blue-800">
            Tempo restante: <strong>{timeRemaining}</strong>
          </p>
          <p className="text-blue-700 text-sm mt-2">
            Aproveite estas 3 horas para conhecer todas as funcionalidades. 
            Após isso, será necessário escolher um plano.
          </p>
          <a
            href="/dashboard/billing"
            className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
          >
            Ver Planos
          </a>
        </div>

        {/* Dashboard normal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* KPIs */}
          {/* ... resto do dashboard ... */}
        </div>
      </div>
    );
  }

  if (tenant?.status === 'TRIAL_EXPIRED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            ⏳ Trial Expirado
          </h1>
          <p className="text-gray-600 mb-6">
            Seu período de teste de 3 horas terminou. 
            Escolha um plano para continuar usando o BeautyFlow.
          </p>
          <a
            href="/dashboard/billing"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700"
          >
            Ver Planos e Pagar
          </a>
        </div>
      </div>
    );
  }

  // Status ACTIVE - Mostrar dashboard normal
  return <DashboardContent />;
}
```

---

### 3️⃣ Billing - Planos e Checkout

#### `/dashboard/billing` — Escolher Plano e Pagar

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    features: ['5 profissionais', 'Agenda', '1000 clientes'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299,
    features: ['Profissionais ilimitados', 'Automações', 'WhatsApp'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    features: ['Multi-unidade', 'API pública', 'Suporte dedicado'],
  },
];

export default function BillingPage() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tenantId: tenant?.id,
          planId,
          successUrl: `${window.location.origin}/dashboard/billing/success`,
          cancelUrl: `${window.location.origin}/dashboard/billing`,
        }),
      });

      const { checkoutUrl } = await response.json();

      // Redirecionar para Stripe
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">Escolha seu Plano</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg shadow-lg p-8 ${
                plan.recommended ? 'border-4 border-blue-500 relative' : ''
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Recomendado
                </div>
              )}

              <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
              <p className="text-4xl font-bold text-blue-600 mb-6">
                R$ {plan.price}
                <span className="text-lg text-gray-500">/mês</span>
              </p>

              <ul className="mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center mb-3">
                    <span className="text-green-500 mr-3">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Escolher Plano'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

#### `/dashboard/billing/success` — Confirmação de Pagamento

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Verificar sessão no backend
    const verifySession = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/billing/verify?sessionId=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          // Sucesso! Redirecionar ao dashboard após 3s
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      }
    };

    if (sessionId) {
      verifySession();
    }
  }, [sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">Pagamento Confirmado!</h1>
        <p className="text-gray-600 mb-6">
          Obrigado! Seu acesso foi liberado. Redirecionando para o dashboard...
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
      </div>
    </div>
  );
}
```

---

## 👥 Página do Cliente - Agendar

### Cliente App - Simples

#### `/customer/schedule` — Agendar Horário

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function CustomerSchedulePage() {
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);

  // Buscar dados
  useEffect(() => {
    const fetchData = async () => {
      const token = new URL(window.location).searchParams.get('token');
      
      const [servicesRes, profRes] = await Promise.all([
        fetch('/api/services', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/professionals', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      setServices(await servicesRes.json());
      setProfessionals(await profRes.json());
    };

    fetchData();
  }, []);

  // Buscar horários disponíveis
  useEffect(() => {
    if (selectedDate && selectedProfessional) {
      const fetchAvailable = async () => {
        const res = await fetch(
          `/api/professionals/${selectedProfessional}/availability?date=${selectedDate}`
        );
        setAvailableTimes(await res.json());
      };

      fetchAvailable();
    }
  }, [selectedDate, selectedProfessional]);

  // Confirmar agendamento
  const handleSchedule = async () => {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedService,
        professionalId: selectedProfessional,
        date: selectedDate,
        time: selectedTime,
      }),
    });

    if (res.ok) {
      alert('✅ Agendamento confirmado!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Agendar Horário</h1>

        {/* Serviço */}
        <div className="mb-4">
          <label className="block font-semibold mb-2">Serviço</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Selecione um serviço</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Profissional */}
        <div className="mb-4">
          <label className="block font-semibold mb-2">Profissional</label>
          <select
            value={selectedProfessional}
            onChange={(e) => setSelectedProfessional(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Selecione um profissional</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Data */}
        <div className="mb-4">
          <label className="block font-semibold mb-2">Data</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Horário */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">Horário</label>
          <div className="grid grid-cols-3 gap-2">
            {availableTimes.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`p-2 rounded font-semibold ${
                  selectedTime === time
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Confirmar */}
        <button
          onClick={handleSchedule}
          disabled={!selectedService || !selectedProfessional || !selectedDate || !selectedTime}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          Confirmar Agendamento
        </button>
      </div>
    </div>
  );
}
```

---

## 🔒 Fluxo de Segurança

```
1. Usuário cria conta
   ↓
2. Backend salva tenant com status = TRIALING
   ↓
3. Frontend mostra countdown de 3h
   ↓
4. CRON job roda a cada 5min e verifica trial_ends_at
   ↓
5. Se trial_ends_at < NOW(), atualiza status = TRIAL_EXPIRED
   ↓
6. Todas as requisições passam por trialGuard middleware
   ↓
7. Se TRIAL_EXPIRED e sem subscription_id, retorna 403 FORBIDDEN
   ↓
8. Cliente é redirecionado para /dashboard/billing
   ↓
9. Se paga, subscription_id é salvo e status = ACTIVE
   ↓
10. Se não pagar em 300 dias, CRON deleta conta
```

---

## 📊 Checklist de Implementação

### Backend
- [ ] Adicionar colunas em `beauty_shops` (status, trial_ends_at, etc)
- [ ] Implementar middleware `trialGuard`
- [ ] Criar endpoints de billing
- [ ] Integrar Stripe webhooks
- [ ] Implementar CRON jobs (trial expiration, account deletion)

### Frontend
- [ ] Página `/auth/signup`
- [ ] Modificar `/dashboard` para mostrar trial countdown
- [ ] Criar `/dashboard/billing` com planos
- [ ] Criar `/dashboard/billing/success`
- [ ] Página `/customer/schedule` para clientes

### DevOps
- [ ] Configurar variáveis de ambiente Stripe
- [ ] Testar webhooks localmente com ngrok
- [ ] Testar CRON jobs

---

**Pronto! Este é o fluxo SaaS completo com trial e cobrança.** 🚀
