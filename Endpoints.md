# 📱 GUIA COMPLETO - TESTANDO BEAUTYFLOW NO POSTMAN

## 🎯 O que você vai aprender
Teste todos os **42 endpoints** da FASE 1 do BeautyFlow direto no Postman com este guia passo a passo.

---

## 📋 PRÉ-REQUISITOS

### ✅ Ter instalado:
1. **Postman** - Baixar em https://www.postman.com/downloads/
2. **Backend rodando** - `npm run dev` na porta 3000
3. **Database inicializado** - `npm run init-db` rodado com sucesso

### ✅ Verificar que tudo está pronto:
```bash
# Terminal 1: Rodar Backend
cd backend
npm run dev

# Resultado esperado:
# Server running on port 3000
```

---

## 🚀 PASSO 1: CRIAR NOVA COLLECTION NO POSTMAN

### 1.1 Abra o Postman
- Clique em **Collections** (lado esquerdo)
- Clique em **+ Create a New Collection**
- Nome: `BeautyFlow-API`
- Clique em **Create**

### 1.2 Criar Pastas Organizadas
Dentro da collection `BeautyFlow-API`, crie estas pastas:

```
BeautyFlow-API
├── 00-Health
├── 01-Professionals
├── 02-Services
├── 03-Products
├── 04-Appointments
└── 05-Sales
```

**Como criar pasta:**
- Clique com botão direito em `BeautyFlow-API`
- Selecione **Add Folder**
- Digite o nome e confirme

---

## 🔧 PASSO 2: CONFIGURAR VARIÁVEIS DE AMBIENTE

### 2.1 Criar Environment
- Clique em **Environments** (lado esquerdo)
- Clique em **Create Environment**
- Nome: `BeautyFlow-Local`

### 2.2 Adicionar Variáveis
No novo environment, adicione estas variáveis:

| Key | Value |
|-----|-------|
| `baseUrl` | `http://localhost:3000` |
| `tenantId` | `550e8400-e29b-41d4-a716-446655440000` |
| `customerId` | `660e8400-e29b-41d4-a716-446655440001` |
| `professionalId` | (deixe em branco - preencherá após criar) |
| `serviceId` | (deixe em branco - preencherá após criar) |
| `productId` | (deixe em branco - preencherá após criar) |
| `appointmentId` | (deixe em branco - preencherá após criar) |
| `saleId` | (deixe em branco - preencherá após criar) |

Clique em **Save**

### 2.3 Selecionar Environment
No canto superior direito do Postman, no dropdown de environment, selecione **BeautyFlow-Local**

### 2.4 ⚠️ VERIFICAÇÃO IMPORTANTE - Confirmar que as variáveis estão preenchidas
**ANTES DE FAZER QUALQUER REQUISIÇÃO, FAÇA ISTO:**

1. No Postman, clique em **Environments** (lado esquerdo)
2. Clique em **BeautyFlow-Local**
3. Verifique se aparece assim:

| Variable | Value |
|----------|-------|
| baseUrl | http://localhost:3000 |
| tenantId | 550e8400-e29b-41d4-a716-446655440000 |
| customerId | 660e8400-e29b-41d4-a716-446655440001 |

**Se estiverem em branco, preencha agora!**

4. Clique em **Save** (Ctrl+S)
5. No canto superior direito, selecione o environment no dropdown

**Agora sim está pronto!** ✅

---

## ✅ PASSO 3: CRIAR REQUESTS - HEALTH CHECK

### 3.1 Nova Request em "00-Health"
- Clique com direito em pasta **00-Health**
- Selecione **Add Request**
- Nome: `GET Health Check`

### 3.2 Configurar Request
```
Method: GET
URL: {{baseUrl}}/
```

### 3.3 Testar
- Clique em **Send**
- Você deve ver:
```json
{
  "status": "ok",
  "service": "BarberFlow API",
  "version": "1.0.0"
}
```

✅ Se receber isto, está tudo funcionando!

---

## 👥 PASSO 4: PROFESSIONALS - CRIAR TODOS OS REQUESTS

### 4.1 POST - Criar Profissional #1
**Em pasta: 01-Professionals**

```
Method: POST
URL: {{baseUrl}}/api/tenants/{{tenantId}}/professionals
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Ana Silva",
  "phone": "11999999999",
  "commissionRate": 15.5,
  "bufferMinutes": 10
}
```

**Ao enviar:**
- Copie o `id` da resposta
- Clique em **Environments** (Postman)
- Cole o ID em `professionalId`
- **Save** (Ctrl+S)

---

### 4.2 POST - Criar Profissional #2
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Maria Santos",
  "phone": "11988888888",
  "commissionRate": 20,
  "bufferMinutes": 15
}
```

---

### 4.3 GET - Listar Todos
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/professionals
```

---

### 4.4 GET - Obter Um
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/professionals/{{professionalId}}
```

---

### 4.5 PUT - Atualizar
```
Method: PUT
URL: {{baseUrl}}/api/tenants/{{tenantId}}/professionals/{{professionalId}}
```

**Body:**
```json
{
  "commissionRate": 25,
  "bufferMinutes": 20
}
```

---

### 4.6 DELETE - Deletar
```
Method: DELETE
URL: {{baseUrl}}/api/tenants/{{tenantId}}/professionals/{{professionalId}}
```

---

## 🤝 PASSO 5: CUSTOMERS - CRIAR TODOS OS REQUESTS

### 5.1 POST - Criar Cliente #1
**Em pasta: 02-Customers**

```
Method: POST
URL: {{baseUrl}}/api/customers
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "João Silva",
  "phone": "+5511999999999",
  "email": "joao@example.com"
}
```

**Ao receber resposta:**
- Copie o `id`
- Vá em **Environments**
- Cole o ID em `customerId`
- **Save**

---

### 5.2 GET - Listar Todos os Clientes do tenant
```
Method: GET
URL: {{baseUrl}}/api/customers?tenantId={{tenantId}}
```

---

### 5.3 GET - Obter Um Cliente
```
Method: GET
URL: {{baseUrl}}/api/customers/{{customerId}}
```

---

### 5.4 PUT - Atualizar Cliente
```
Method: PUT
URL: {{baseUrl}}/api/customers/{{customerId}}
```

**Body:**
```json
{
  "name": "João da Silva",
  "phone": "+5511988887777",
  "email": "joao.silva@example.com",
  "tags": ["returning", "vip"],
  "lastVisit": "2026-05-06T14:00:00.000Z"
}
```

---

### 5.5 DELETE - Deletar Cliente
```
Method: DELETE
URL: {{baseUrl}}/api/customers/{{customerId}}
```

---

## 🛎️ PASSO 6: SERVICES - CRIAR TODOS OS REQUESTS

### 6.1 POST - Criar Serviço #1
**Em pasta: 02-Services**

```
Method: POST
URL: {{baseUrl}}/api/tenants/{{tenantId}}/services
```

**Body:**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Corte de Cabelo",
  "durationMinutes": 30,
  "price": 50.00,
  "commissionRate": 20
}
```

**Ao receber resposta:**
- Copie o `id`
- Vá em **Environments**
- Cole em `serviceId`
- **Save**

---

### 6.2 POST - Criar Serviço #2
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Cílios Postiços",
  "durationMinutes": 60,
  "price": 80.00,
  "commissionRate": 15
}
```

---

### 6.3 POST - Criar Serviço #3
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Tingimento",
  "durationMinutes": 90,
  "price": 120.00,
  "commissionRate": 15
}
```

---

### 6.4 GET - Listar Todos
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/services
```

---

### 6.5 GET - Obter Um
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/services/{{serviceId}}
```

---

### 6.6 PUT - Atualizar
```
Method: PUT
URL: {{baseUrl}}/api/tenants/{{tenantId}}/services/{{serviceId}}
```

**Body:**
```json
{
  "price": 60.00,
  "durationMinutes": 45
}
```

---

### 6.7 DELETE - Deletar
```
Method: DELETE
URL:  
```

---

## 📦 PASSO 7: PRODUCTS - CRIAR TODOS OS REQUESTS

### 7.1 POST - Criar Produto #1
**Em pasta: 03-Products**

```
Method: POST
URL: {{baseUrl}}/api/tenants/{{tenantId}}/products
```

**Body:**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Shampoo Premium",
  "currentStock": 50,
  "minThreshold": 10,
  "costPrice": 15.00,
  "salePrice": 35.00
}
```

**Ao receber resposta:**
- Copie o `id`
- Vá em **Environments**
- Cole em `productId`
- **Save**

---

### 7.2 POST - Criar Produto #2
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Condicionador Hidratante",
  "currentStock": 30,
  "minThreshold": 8,
  "costPrice": 18.00,
  "salePrice": 40.00
}
```

---

### 7.3 POST - Criar Produto #3
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Óleo Capilar",
  "currentStock": 15,
  "minThreshold": 5,
  "costPrice": 20.00,
  "salePrice": 45.00
}
```

---

### 7.4 GET - Listar Todos
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/products
```

---

### 7.5 GET - Obter Um
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/products/{{productId}}
```

---

### 7.6 PUT - Atualizar
```
Method: PUT
URL: {{baseUrl}}/api/tenants/{{tenantId}}/products/{{productId}}
```

**Body (atualizar preço):**
```json
{
  "salePrice": 40.00
}
```

**Body (definir estoque absoluto):**
```json
{
  "currentStock": 60
}
```

**Body (adicionar ao estoque):**
```json
{
  "adjustStock": 10
}
```

**Body (remover do estoque):**
```json
{
  "adjustStock": -5
}
```

---

### 7.7 DELETE - Deletar
```
Method: DELETE
URL: {{baseUrl}}/api/tenants/{{tenantId}}/products/{{productId}}
```

---

## 📅 PASSO 8: APPOINTMENTS - ⭐ CRÍTICO (TESTE DE CONFLITO)

### 8.1 POST - Criar Agendamento (SEM CONFLITO)
**Em pasta: 04-Appointments**

```
Method: POST
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments
```

**Body:**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "660e8400-e29b-41d4-a716-446655440001",
  "professionalId": "{{professionalId}}",
  "serviceId": "{{serviceId}}",
  "startTime": "2026-05-15T14:00:00Z",
  "endTime": "2026-05-15T14:30:00Z",
  "internalNotes": "Cliente VIP"
}
```

**Ao receber (status 201):**
- Copie o `id`
- Vá em **Environments**
- Cole em `appointmentId`
- **Save**

---

### 8.2 POST - Tentar Criar COM CONFLITO (DEVE FALHAR)
Nome: `POST Appointment - CONFLICT TEST (esperado 409)`

```
Method: POST
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments
```

**Body:**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "660e8400-e29b-41d4-a716-446655440001",
  "professionalId": "{{professionalId}}",
  "serviceId": "{{serviceId}}",
  "startTime": "2026-05-15T14:15:00Z",
  "endTime": "2026-05-15T14:45:00Z",
  "internalNotes": "Deve falhar - conflita!"
}
```

**Esperado:**
- Status: **409 Conflict**
- Resposta:
```json
{
  "error": "Time slot not available",
  "conflicts": [...]
}
```

✅ Se receber 409, significa que a validação funcionou!

---

### 8.3 POST - Criar SEM CONFLITO (APÓS BUFFER)
Nome: `POST Appointment - OK (após buffer)`

```
Method: POST
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments
```

**Body:**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "660e8400-e29b-41d4-a716-446655440001",
  "professionalId": "{{professionalId}}",
  "serviceId": "{{serviceId}}",
  "startTime": "2026-05-15T14:45:00Z",
  "endTime": "2026-05-15T15:15:00Z",
  "internalNotes": "Sem conflito - OK!"
}
```

**Esperado:**
- Status: **201 Created**

✅ Isto prova que a validação está funcionando!

---

### 8.4 GET - Listar Todos
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments
```

---

### 8.5 GET - Listar por Cliente
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments?customerId=660e8400-e29b-41d4-a716-446655440001
```

---

### 8.6 GET - Listar por Profissional
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments?professionalId={{professionalId}}
```

---

### 8.7 GET - Listar por Data Range
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments?startDate=2026-05-01&endDate=2026-05-31
```

---

### 8.8 GET - Obter Um
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments/{{appointmentId}}
```

---

### 8.9 PUT - Atualizar Status
```
Method: PUT
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments/{{appointmentId}}
```

**Body:**
```json
{
  "status": "completed",
  "internalNotes": "Cliente satisfeito"
}
```

---

### 8.10 DELETE - Cancelar
```
Method: DELETE
URL: {{baseUrl}}/api/tenants/{{tenantId}}/appointments/{{appointmentId}}
```

---

## 🛒 PASSO 9: SALES - ⭐ CRÍTICO (TESTE CASCATA)

### 9.1 POST - Criar Venda (SERVIÇO + PRODUTO)
**Em pasta: 05-Sales**

```
Method: POST
URL: {{baseUrl}}/api/tenants/{{tenantId}}/sales
```

**Body:**
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "660e8400-e29b-41d4-a716-446655440001",
  "professionalId": "{{professionalId}}",
  "paymentMethod": "credit_card",
  "items": [
    {
      "serviceId": "{{serviceId}}",
      "quantity": 1,
      "unitPrice": 50.00
    },
    {
      "productId": "{{productId}}",
      "quantity": 2,
      "unitPrice": 35.00
    }
  ]
}
```

**Ao receber (status 201):**
- Copie o `id`
- Vá em **Environments**
- Cole em `saleId`
- **Save**

**Cascata automática:**
- ✅ Venda criada
- ✅ Estoque decrementado
- ✅ Transação financeira registrada
- ✅ Cliente.last_visit atualizado

---

### 9.2 GET - Verificar Estoque Decrementado
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/products/{{productId}}
```

**Verifique:** `currentStock` deve ter REDUZIDO!

Se tinha 50, agora deve ter 48 (50 - 2 itens vendidos)

✅ Isto prova que a cascata funcionou!

---

### 9.3 GET - Listar Todas as Vendas
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/sales
```

---

### 9.4 GET - Listar Vendas do Cliente
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/sales?customerId=660e8400-e29b-41d4-a716-446655440001
```

---

### 9.5 GET - Listar por Data Range
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/sales?startDate=2026-05-01&endDate=2026-05-31
```

---

### 9.6 GET - Obter Venda com Itens
```
Method: GET
URL: {{baseUrl}}/api/tenants/{{tenantId}}/sales/{{saleId}}
```

---

## 🎯 SEQUÊNCIA RECOMENDADA DE TESTE

### Ordem Correta para Testar Tudo:

```
1. ✅ Health Check
2. ✅ Professionals (criar 2, listar, get, update, delete)
3. ✅ Customers (criar, listar, get, update, delete)
4. ✅ Services (criar 3, listar, get, update, delete)
5. ✅ Products (criar 3, listar, get, update, stock add/remove, delete)
6. ✅ Appointments (criar sem conflito, tentar com conflito → 409, criar sem conflito após, listar, get, update, delete)
7. ✅ Sales (criar venda, verificar estoque, listar, get com itens)
```

Se todos passar ✅, a FASE 1 está 100% funcionando!

---

## 🧪 TESTE FINAL - VERIFICAÇÃO RÁPIDA

### Copy-Paste Esta Sequência:

1. **POST** Health
   - Enviar → Status 200 ✅

2. **POST** Professional
   - Enviar → Status 201 ✅
   - Copiar ID para environment

3. **POST** Customer
   - Enviar → Status 201 ✅
   - Copiar ID para environment

4. **POST** Service
   - Enviar → Status 201 ✅
   - Copiar ID para environment

5. **POST** Product
   - Enviar → Status 201 ✅
   - Copiar ID para environment

6. **POST** Appointment (sem conflito)
   - Enviar → Status 201 ✅

7. **POST** Appointment (com conflito)
   - Enviar → Status 409 ✅ (IMPORTANTE!)

8. **GET** Product
   - Enviar → Ver `currentStock` ✅

9. **POST** Sale
   - Enviar → Status 201 ✅

10. **GET** Product (novamente)
   - Enviar → Ver `currentStock` REDUZIDO ✅ (IMPORTANTE!)

---

## 📊 SE TUDO PASSOU:

```
✅ Health Check funcionando
✅ CRUD Professionals OK
✅ CRUD Services OK
✅ CRUD Products com estoque OK
✅ Validação de Conflito OK (409)
✅ Cascata de Vendas OK
✅ Estoque decrementado OK

🎉 FASE 1 ESTÁ 100% FUNCIONAL! 🎉
```

---

## 🚨 TROUBLESHOOTING NO POSTMAN

### Problema: "error": "tenantId is required"
**Solução (MUITO IMPORTANTE):**

1. Clique em **Environments** (lado esquerdo do Postman)
2. Clique em **BeautyFlow-Local**
3. Procure pelo campo `tenantId`
4. Verifique o **valor**: `550e8400-e29b-41d4-a716-446655440000`
5. Se estiver em branco ou vazio, preencha!
6. Clique em **Save** (Ctrl+S)
7. Volte em sua requisição
8. Clique em **Send** novamente

**Isto deve resolver!** ✅

---

### Problema: "Connection refused"
**Solução:**
```bash
# Terminal: Verificar se backend está rodando
npm run dev

# Esperado: "Server running on port 3000"
```

### Problema: "status 400 - validation failed"
**Solução:**
- Verifique o JSON no Body
- Certifique que todas as aspas estão corretas
- Verifique que o `Content-Type` é `application/json`

### Problema: "{{professionalId}} aparece como texto"
**Solução:**
- Ir em **Environments**
- Verificar se preencheu o valor
- Clicar em **Save**
- Verificar se selecionou o environment no dropdown superior

### Problema: Agendamento retorna 201 mas deveria ser 409
**Solução:**
- O buffer time não está sendo considerado
- Tente mudar para `startTime: "2026-05-15T14:20:00Z"` (mais próximo)
- Profissional tem buffer de 10 min (padrão)

---

## 💡 DICAS IMPORTANTES

### ✅ Salvando Requests
- Toda vez que criar uma request nova, clique em **Save** (Ctrl+S)
- Escolha a pasta correta
- Dê um nome descritivo

### ✅ Usando Variáveis
- Para usar variável do environment: `{{nomeVariavel}}`
- Para testar se funcionou: Clique em **Send** e veja se a URL mudou

### ✅ Copiar ID de Respostas
- Na resposta, procure por `"id": "seu-id-aqui"`
- Copie o valor (sem as aspas)
- Vá em **Environments** → Cole em `"value"`
- Clique em **Save**

### ✅ Testar um após o outro
- Não pule nenhum teste
- Execute na ordem recomendada
- Isto garante que as dependências estejam corretas

---

## 📸 SCREENSHOT EXEMPLO DO POSTMAN SETADO

```
┌─ Postman ─────────────────────────────────────┐
│ BeautyFlow-API                                │
│ ├─ 00-Health                                  │
│ ├─ 01-Professionals                           │
│ │  ├─ POST Create Professional                │
│ │  ├─ GET List All                            │
│ │  ├─ GET Get One                             │
│ │  ├─ PUT Update                              │
│ │  └─ DELETE Delete                           │
│ ├─ 02-Services                                │
│ ├─ 03-Products                                │
│ ├─ 04-Appointments                            │
│ └─ 05-Sales                                   │
│                                               │
│ Environment: BeautyFlow-Local ▼              │
│ tenantId: 550e8400-e29b-41d4-a716-...        │
│ professionalId: abc123-def456-...            │
└───────────────────────────────────────────────┘
```

---

## 🎉 PRONTO!

Agora você tem tudo para testar a FASE 1 no Postman!

**Próximo passo:** Começar a executar os testes na ordem recomendada.

Qualquer dúvida, avise! ✅

---

# 🔒 Infraestrutura de Segurança e Performance — BeautyFlow Backend

## 1. REDIS — Cache e Locks Distribuídos

### Propósito
- **Cache de dados** para reduzir queries ao banco
- **Locks distribuídos** para evitar race conditions (double-booking)
- **Sessões** e state management

### Configuração

```bash
# Instalar Redis localmente
# Windows: https://github.com/microsoftarchive/redis/releases
# macOS: brew install redis
# Linux: sudo apt-get install redis-server

# Iniciar Redis
redis-server

# Variáveis de ambiente (.env)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # deixar vazio se sem auth
```

### Uso no código

```typescript
// Lock de agendamento (evita double-booking)
const lockId = await redisClient.acquireLock(`lock:appointment:${profId}:${slot}`, 10);
if (!lockId) {
  return res.status(409).json({ error: 'Slot being booked' });
// ... criar agendamento ...
await redisClient.releaseLock(lockKey, lockId);
```

---

## 2. Background Workers — Automações e Relatórios

### Serviços implementados

| Worker | Frequência | Função |
|---|---|---|
| **Retention** | A cada 6 horas | Dispara automações de retenção (last_visit_gt_days) |
| **Analytics** | Diariamente 00:00 | Gera resumos diários de receita e agendamentos |
| **Cleanup** | Semanalmente (domingo 02:00) | Remove audit logs antigos (> 1 ano) — LGPD |

### Inicialização automática

Os workers são iniciados automaticamente no `src/index.ts`:

```typescript
WorkerService.startAllWorkers();
```

---

## 3. Row-Level Security (RLS) — Multi-tenant Isolation

### Conceito

RLS garante que cada tenant **nunca consegue acessar dados de outro tenant**, mesmo que a aplicação tivesse uma falha.

### Implementação

Tabelas com RLS habilitado:
- `customers`
- `appointments`
- `sales`
- `audit_logs`
- `professionals`
- `services`
- `products`
- `transactions`
- `automations`
- `messages`
- `loyalty_points`
- `membership_plans`
- `subscriptions`
- `sale_items` (RLS via parent table `sales`)

### Policy criada

```sql
CREATE POLICY tenant_isolation_customers ON customers
USING (tenant_id = current_setting('app.tenant_id')::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Como usar no código

Antes de executar queries sensíveis, defina o contexto do tenant:

```typescript
// Executar no PostgreSQL
SET app.tenant_id = '550e8400-e29b-41d4-a716-446655440000';

// Agora qualquer SELECT em `customers` será filtrado por tenant_id
SELECT * FROM customers; -- Retorna apenas de um tenant
```

### ⚠️ Importante

Se você ativar RLS sem usar `SET app.tenant_id`, as queries retornarão 0 linhas! Certifique-se de:

1. Adicionar middleware que execute `SET app.tenant_id` em cada request
2. Usar pool connection que define o setting automaticamente

---

## 4. PITR (Point-in-Time Recovery) — Backup Contínuo

### Objetivo
Recuperar o banco para qualquer ponto no tempo nos últimos 7 dias.

### Scripts implementados

O projeto inclui scripts automatizados para backup e recovery:

```bash
# Configurar PITR no banco
npm run setup-pitr

# Criar backup base
./scripts/backup.sh base

# Recuperar para um ponto específico
./scripts/recover.sh "2024-01-15 10:30:00" ./backups/base_20240115_100000
```

### Configuração no PostgreSQL (produção)

**Via Heroku/AWS RDS:**
```bash
# Heroku
heroku addons:create heroku-postgresql:premium-3 --follow basic-db
heroku pg:backups:schedule DATABASE_URL --at '02:00 UTC'

# AWS RDS
# 1. Ir ao console AWS RDS
# 2. Selecionar database
# 3. Backup retention period → 30 days
# 4. Backup window → 02:00 UTC
```

**Via Docker Postgres local (desenvolvimento):**
```dockerfile
# docker-compose.yml
postgres:
  image: postgres:15
  environment:
    POSTGRES_PASSWORD: password
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backups:/backups
  command: >
    postgres
    -c wal_level=replica
    -c archive_mode=on
    -c archive_command='mkdir -p /backups/wal && cp %p /backups/wal/%f'
```

### Restaurar backup

```bash
# Heroku
heroku pg:backups:restore 'https://your-backup-url' DATABASE_URL

# AWS RDS (console ou AWS CLI)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier new-database-name \
  --db-snapshot-identifier snapshot-id
```

---

## 5. Audit Logs — Conformidade LGPD

### Tabela criada

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(20), -- POST, PUT, DELETE
  resource VARCHAR(100), -- customers, appointments
  resource_id VARCHAR(255),
  changes JSONB, -- antes/depois dos dados
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Middleware automático

Toda operação de modificação (POST, PUT, DELETE) é automaticamente logada:

```typescript
app.use(auditMiddleware); // Middleware que loga mudanças
```

### Query de auditoria

```typescript
const logs = await auditService.getLogs(tenantId, 'customers', 100);
// Retorna últimas 100 operações no recurso 'customers'
```

### LGPD — Retenção de dados

- Audit logs são **retidos por 1 ano**
- Worker executa limpeza automaticamente (domingo 02:00)
- Dados de customers podem ser anonimizados via `DELETE /api/customers/:id`

---

## ✅ Checklist de Segurança

- [x] Redis com locks para evitar double-booking
- [x] Workers para automações (cron jobs)
- [x] RLS habilitado em todas as tabelas tenant-scoped
- [x] Audit logs para todas as mudanças
- [x] PITR configurado com scripts automatizados
- [ ] Implementar `SET app.tenant_id` em cada middleware (próxima etapa)
- [ ] Testar LGPD data deletion workflow
- [ ] Backups diários em produção

---

## 📊 Monitoramento

### Verificar health do Redis

```bash
redis-cli PING
# PONG
```

### Verificar workers rodando

Logs no console:
```
[Worker] Retention automation worker started (every 6 hours)
[Worker] Analytics worker started (daily at 00:00)
[Worker] LGPD cleanup worker started (weekly on Sunday 02:00)
```

### Verificar RLS habilitado

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
-- Deve retornar: customers, appointments, sales, audit_logs
```

---

## 🚀 Próximos Passos

1. **Middleware de RLS** — Implementar `SET app.tenant_id` automaticamente
2. **Monitoramento** — Integrar com DataDog/New Relic
3. **Alertas** — Notificações para falhas de workers
4. **Encryption** — End-to-end encryption para dados sensíveis

---

---

## 🚀 Endpoints Implementados

Use `{{baseUrl}}` e IDs válidos nos requests. Não envie `:tenantId`, `:id` ou `:customerId` como texto literal.

### Health
```http
GET /
```

### Auth
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Tenants
```http
POST /api/tenants
Content-Type: application/json

{
  "name": "Salão Exemplo",
  "email": "salao@example.com",
  "phone": "+5511999999999"
}
```

```http
PUT /api/tenants/:id
Content-Type: application/json

{
  "name": "Salão Atualizado",
  "email": "novoemail@example.com"
}
```

### Customers
```http
POST /api/customers
Content-Type: application/json

{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "João Silva",
  "phone": "+5511999999999",
  "email": "joao@example.com"
}
```

```http
PUT /api/customers/:id
Content-Type: application/json

{
  "name": "João da Silva",
  "phone": "+5511988887777",
  "email": "joao.silva@example.com"
}
```

### Professionals
```http
POST /api/tenants/:tenantId/professionals
Content-Type: application/json

{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Ana Silva",
  "phone": "11999999999",
  "commissionRate": 15.5,
  "bufferMinutes": 10
}
```

```http
PUT /api/tenants/:tenantId/professionals/:id
Content-Type: application/json

{
  "commissionRate": 20.0,
  "bufferMinutes": 15
}
```

### Services
```http
POST /api/tenants/:tenantId/services
Content-Type: application/json

{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Corte de Cabelo",
  "durationMinutes": 30,
  "price": 50.00,
  "commissionRate": 20
}
```

```http
PUT /api/tenants/:tenantId/services/:id
Content-Type: application/json

{
  "price": 60.00,
  "durationMinutes": 45
}
```

### Products
```http
POST /api/tenants/:tenantId/products
Content-Type: application/json

{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Shampoo Premium",
  "currentStock": 50,
  "minThreshold": 10,
  "costPrice": 15.00,
  "salePrice": 35.00
}
```

```http
PUT /api/tenants/:tenantId/products/:id
Content-Type: application/json

{
  "salePrice": 40.00
}
```

```http
POST /api/tenants/:tenantId/products/:id/adjust-stock
Content-Type: application/json

{
  "type": "IN",
  "quantity": 10,
  "reason": "Compra de fornecedor"
}
```

### Appointments
```http
POST /api/tenants/:tenantId/appointments
Content-Type: application/json

{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "660e8400-e29b-41d4-a716-446655440001",
  "professionalId": "professional-id",
  "serviceId": "service-id",
  "startTime": "2026-05-15T14:00:00Z",
  "endTime": "2026-05-15T14:30:00Z"
}
```

```http
PUT /api/tenants/:tenantId/appointments/:id
Content-Type: application/json

{
  "status": "completed",
  "internalNotes": "Cliente satisfeito"
}
```

### Sales
```http
POST /api/tenants/:tenantId/sales
Content-Type: application/json

{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "660e8400-e29b-41d4-a716-446655440001",
  "professionalId": "professional-id",
  "paymentMethod": "credit_card",
  "items": [
    {
      "serviceId": "service-id",
      "quantity": 1,
      "unitPrice": 50.00
    },
    {
      "productId": "product-id",
      "quantity": 2,
      "unitPrice": 35.00
    }
  ]
}
```

### Automations
```http
POST /api/automations
Content-Type: application/json

{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Automação de Retenção",
  "type": "retention",
  "config": {
    "lastVisitGtDays": 30,
    "message": "Olá! Sentimos sua falta."
  }
}
```

```http
PUT /api/automations/:id
Content-Type: application/json

{
  "name": "Automação Atualizada",
  "config": {
    "lastVisitGtDays": 45
  }
}
```

```http
POST /api/automations/execute
Content-Type: application/json

{
  "automationId": "automation-id"
}
```

### Loyalty
```http
POST /api/tenants/:tenantId/customers/:customerId/loyalty/add
Content-Type: application/json

{
  "points": 100,
  "reason": "Compra de R$ 50,00",
  "referenceId": "sale-id"
}
```

```http
POST /api/tenants/:tenantId/customers/:customerId/loyalty/redeem
Content-Type: application/json

{
  "points": 50,
  "reason": "Desconto em serviço",
  "referenceId": "appointment-id"
}
```

---

## 📌 Observações importantes
- Use `{{baseUrl}}` em vez de `http://localhost:3000` apenas quando estiver usando variáveis de ambiente no Postman.
- Preencha `tenantId`, `customerId`, `professionalId`, `serviceId`, `productId`, `appointmentId` e `saleId` com os valores retornados pelas requests criadas anteriormente.
- As rotas de analytics requerem autenticação via `Authorization` header.
- Os endpoints de automations também usam autenticação.

### Erros de Autenticação
- **Sem token**: `{"error":"No token provided"}` (status 401)
- **Token inválido**: `{"error":"Invalid token"}` (status 401)
