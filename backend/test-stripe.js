const BASE_URL = 'http://localhost:3000';

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const responseData = await response.json();

    if (response.ok) {
      console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
      return responseData;
    } else {
      console.log(`❌ ${method} ${endpoint} - Status: ${response.status} - ${responseData.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
    return null;
  }
}

async function testStripeCheckout() {
  console.log('🧪 Testando integração com Stripe...\n');

  // 1. Login
  console.log('1. Fazendo login...');
  const loginData = await makeRequest('POST', '/api/auth/login', {
    email: 'test@example.com',
    password: 'password123'
  });

  if (!loginData?.token) {
    console.log('❌ Falha no login');
    return;
  }

  const authToken = loginData.token;
  console.log('✅ Login realizado, token obtido\n');

  // 2. Criar tenant
  console.log('2. Criando tenant...');
  const uniqueSlug = `test-salon-${Date.now()}`;
  const tenantData = await makeRequest('POST', '/api/tenants', {
    name: 'Test Salon',
    slug: uniqueSlug,
    businessHours: {
      monday: '09:00-18:00',
      tuesday: '09:00-18:00',
      wednesday: '09:00-18:00',
      thursday: '09:00-18:00',
      friday: '09:00-18:00',
      saturday: '09:00-16:00',
      sunday: 'closed'
    }
  }, { Authorization: `Bearer ${authToken}` });

  if (!tenantData?.tenant?.id) {
    console.log('❌ Falha ao criar tenant');
    return;
  }

  const tenantId = tenantData.tenant.id;
  console.log(`✅ Tenant criado: ${tenantId}\n`);

  // 3. Criar customer
  console.log('3. Criando customer...');
  const customerData = await makeRequest('POST', '/api/customers', {
    name: 'João Silva',
    email: 'joao@test.com',
    phone: '11988888888',
    tenantId: tenantId
  }, { Authorization: `Bearer ${authToken}` });

  if (!customerData?.customer?.id) {
    console.log('❌ Falha ao criar customer');
    return;
  }

  const customerId = customerData.customer.id;
  console.log(`✅ Customer criado: ${customerId}\n`);

  // 4. Criar service
  console.log('4. Criando service...');
  const serviceData = await makeRequest('POST', `/api/tenants/${tenantId}/services`, {
    tenantId: tenantId,
    name: 'Corte Masculino',
    description: 'Corte completo',
    durationMinutes: 30,
    price: 45.00,
    commissionRate: 20
  }, { Authorization: `Bearer ${authToken}` });

  if (!serviceData?.id) {
    console.log('❌ Falha ao criar service');
    return;
  }

  const serviceId = serviceData.id;
  console.log(`✅ Service criado: ${serviceId}\n`);

  // 5. Criar membership plan
  console.log('5. Criando membership plan...');
  const planData = await makeRequest('POST', `/api/tenants/${tenantId}/membership-plans`, {
    name: 'Plano VIP',
    description: 'Plano mensal com cortes ilimitados',
    price: 199.90,
    billingCycle: 'monthly',
    servicesIncluded: [
      {
        serviceId: serviceId,
        monthlyLimit: 4
      }
    ],
    isActive: true
  }, { Authorization: `Bearer ${authToken}` });

  if (!planData?.plan?.id && !planData?.id) {
    console.log('❌ Falha ao criar membership plan');
    return;
  }

  const planId = planData.plan?.id || planData.id;
  console.log(`✅ Membership plan criado: ${planId}\n`);

  // 6. Testar checkout
  console.log('6. Testando checkout do Stripe...');
  const checkoutData = await makeRequest('POST', `/api/tenants/${tenantId}/payments/checkout`, {
    customerId: customerId,
    planId: planId,
    successUrl: 'http://localhost:3000/success',
    cancelUrl: 'http://localhost:3000/cancel'
  }, { Authorization: `Bearer ${authToken}` });

  if (checkoutData?.checkoutUrl) {
    console.log('✅ Checkout URL gerada com sucesso!');
    console.log('🔗 URL:', checkoutData.checkoutUrl);
    console.log('\n🎉 Integração com Stripe funcionando!');
    console.log('💳 Teste cartões:');
    console.log('   ✅ Sucesso: 4242 4242 4242 4242');
    console.log('   ❌ Falha: 4000 0000 0000 0002');
  } else {
    console.log('❌ Falha ao gerar checkout URL');
    console.log('Resposta:', checkoutData);
  }
}

testStripeCheckout().catch(console.error);