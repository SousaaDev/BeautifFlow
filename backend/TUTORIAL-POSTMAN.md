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
