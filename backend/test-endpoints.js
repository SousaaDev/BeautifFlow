// Configurações base
const BASE_URL = 'http://localhost:3000';
const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_CUSTOMER_ID = 'b1e13af2-3fbe-48ba-a8eb-6cf1c7b26092';

// Variáveis para armazenar IDs criados durante os testes
let tenantId = TEST_TENANT_ID;
let customerId = TEST_CUSTOMER_ID;
let professionalId;
let serviceId;
let productId;
let appointmentId;
let saleId;
let membershipPlanId;
let subscriptionId;
let authToken;
let initialStock;

const randomSuffix = () => Math.random().toString(36).substring(2, 8);
const uniqueSuffix = `${Date.now().toString().slice(-4)}-${randomSuffix()}`;
const testTenantSlug = `salao-teste-${uniqueSuffix}`;
const testTenantEmail = `salao-${uniqueSuffix}@teste.com`;
const testAuthEmail = `test-${uniqueSuffix}@example.com`;
const testCustomerEmail = `cliente-${uniqueSuffix}@teste.com`;

// Função auxiliar para fazer requests
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const fullUrl = `${BASE_URL}${url}`;
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw { response: { status: response.status, data: errorData } };
    }

    const responseData = await response.json();
    console.log(`✅ ${method} ${url} - Status: ${response.status}`);
    return responseData;
  } catch (error) {
    console.log(`❌ ${method} ${url} - Status: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes dos endpoints do BarberFlow...\n');

  // 1. Health Check
  console.log('📊 1. Health Check');
  await makeRequest('GET', '/');

  // 2. Auth - Register
  console.log('\n🔐 2. Auth - Register');
  const registerData = await makeRequest('POST', '/api/auth/register', {
    email: testAuthEmail,
    password: 'password123',
    tenantId: tenantId
  });

  if (registerData?.token) {
    authToken = registerData.token;
    console.log('   Token obtido:', authToken.substring(0, 20) + '...');
  }

  // 3. Auth - Login
  console.log('\n🔐 3. Auth - Login');
  const loginData = await makeRequest('POST', '/api/auth/login', {
    email: testAuthEmail,
    password: 'password123'
  });

  if (loginData?.token) {
    authToken = loginData.token;
    console.log('   Login realizado com sucesso');
  }

  // 4. Tenants - Create
  console.log('\n🏢 4. Tenants - Create');
  const tenantData = await makeRequest('POST', '/api/tenants', {
    name: 'Salão Teste Automatizado',
    email: testTenantEmail,
    phone: '+5511999999999',
    slug: testTenantSlug,
    businessHours: {
      monday: '09:00-18:00',
      tuesday: '09:00-18:00',
      wednesday: '09:00-18:00',
      thursday: '09:00-18:00',
      friday: '09:00-18:00',
      saturday: '09:00-17:00',
      sunday: '09:00-17:00'
    }
  });

  tenantId = tenantData?.tenant?.id || tenantData?.id || tenantId;
  if (tenantId && tenantId !== TEST_TENANT_ID) {
    console.log('   Tenant criado:', tenantId);
  }

  // 5. Customers - Create
  console.log('\n👥 5. Customers - Create');
  const customerData = await makeRequest('POST', '/api/customers', {
    tenantId: tenantId,
    name: 'Cliente Teste Automatizado',
    phone: '+5511988887777',
    email: testCustomerEmail
  });

  customerId = customerData?.customer?.id || customerData?.id || customerId;
  if (customerId && customerId !== TEST_CUSTOMER_ID) {
    console.log('   Customer criado:', customerId);
  } else {
    console.log('   ⚠️  Usando customer ID padrão para continuar testes');
    customerId = TEST_CUSTOMER_ID;
  }

  // 6. Professionals - Create
  console.log('\n💇 6. Professionals - Create');
  const professionalData = await makeRequest('POST', `/api/tenants/${tenantId}/professionals`, {
    tenantId: tenantId,
    name: 'Profissional Teste',
    phone: '+5511977776666',
    commissionRate: 10,
    bufferMinutes: 15
  });

  if (professionalData?.id) {
    professionalId = professionalData.id;
    console.log('   Professional criado:', professionalId);
  }

  // 7. Services - Create
  console.log('\n✂️ 7. Services - Create');
  const serviceData = await makeRequest('POST', `/api/tenants/${tenantId}/services`, {
    tenantId: tenantId,
    name: 'Corte Masculino',
    durationMinutes: 30,
    price: 45.00,
    commissionRate: 20
  });

  if (serviceData?.id) {
    serviceId = serviceData.id;
    console.log('   Service criado:', serviceId);
  }

  // 8. Memberships - Create Plan
  console.log('\n💳 8. Memberships - Create Plan');
  let membershipPlanData = null;
  if (serviceId) {
    membershipPlanData = await makeRequest('POST', `/api/tenants/${tenantId}/membership-plans`, {
      name: 'Plano VIP',
      description: 'Plano mensal com cortes ilimitados e 1 tratamento',
      price: 199.90,
      billingCycle: 'monthly',
      servicesIncluded: [
        {
          serviceId: serviceId,
          monthlyLimit: 4
        }
      ],
      isActive: true
    });
  } else {
    console.log('   ⚠️  Falha ao criar plano de membership: serviceId não definido');
  }

  if (membershipPlanData?.plan?.id || membershipPlanData?.id) {
    membershipPlanId = membershipPlanData?.plan?.id || membershipPlanData?.id;
    console.log('   Plano de membership criado:', membershipPlanId);
  }

  // 9. Memberships - Create Subscription
  console.log('\n📝 9. Memberships - Create Subscription');
  let subscriptionData = null;
  if (membershipPlanId) {
    subscriptionData = await makeRequest('POST', `/api/tenants/${tenantId}/subscriptions`, {
      customerId: customerId,
      planId: membershipPlanId,
      paymentMethod: 'credit_card'
    });
  } else {
    console.log('   ⚠️  Falha ao criar assinatura: membershipPlanId não definido');
  }

  if (subscriptionData?.subscription?.id || subscriptionData?.id) {
    subscriptionId = subscriptionData?.subscription?.id || subscriptionData?.id;
    console.log('   Assinatura criada:', subscriptionId);
  }

  // 10. Memberships - List Subscriptions
  console.log('\n📄 10. Memberships - List Subscriptions');
  await makeRequest('GET', `/api/tenants/${tenantId}/subscriptions`);

  // 11. Memberships - Update Subscription
  console.log('\n✏️ 11. Memberships - Update Subscription');
  if (subscriptionId) {
    await makeRequest('PUT', `/api/tenants/${tenantId}/subscriptions/${subscriptionId}`, {
      status: 'cancelled'
    });
  } else {
    console.log('   ⚠️  Falha ao atualizar assinatura: subscriptionId não definido');
  }

  // 12. Payments - Create Checkout Session
  console.log('\n💳 12. Payments - Create Checkout Session');
  const checkoutData = await makeRequest('POST', `/api/tenants/${tenantId}/payments/checkout`, {
    customerId: customerId,
    planId: membershipPlanId,
    successUrl: 'http://localhost:3000/success',
    cancelUrl: 'http://localhost:3000/cancel'
  }, { Authorization: `Bearer ${authToken}` });

  if (checkoutData?.checkoutUrl) {
    console.log('   Checkout URL gerada:', checkoutData.checkoutUrl);
  } else {
    console.log('   ⚠️  Falha ao gerar checkout URL');
  }

  // 13. Products - Create
  console.log('\n📦 13. Products - Create');
  const productData = await makeRequest('POST', `/api/tenants/${tenantId}/products`, {
    tenantId: tenantId,
    name: 'Gel Fixador',
    currentStock: 150,
    minThreshold: 10,
    costPrice: 15.00,
    salePrice: 25.00
  });

  if (productData?.id) {
    productId = productData.id;
    initialStock = productData.currentStock ?? productData.stock;
    console.log('   Product criado:', productId, 'Stock inicial:', initialStock);
  }

  // 14. Appointments - Create
  console.log('\n📅 14. Appointments - Create');
  const appointmentData = await makeRequest('POST', `/api/tenants/${tenantId}/appointments`, {
    tenantId: tenantId,
    customerId: customerId,
    professionalId: professionalId,
    serviceId: serviceId,
    startTime: '2026-01-15T10:00:00Z',
    endTime: '2026-01-15T10:30:00Z',
    internalNotes: 'Agendamento de teste automatizado'
  });

  if (appointmentData?.id) {
    appointmentId = appointmentData.id;
    console.log('   Appointment criado:', appointmentId);
  }

  // 15. Appointments - Update Status
  console.log('\n📅 15. Appointments - Update Status');
  if (appointmentId) {
    await makeRequest('PATCH', `/api/tenants/${tenantId}/appointments/${appointmentId}`, {
      status: 'completed'
    });
  }

  // 16. Products - Update Stock
  console.log('\n📦 16. Products - Update Stock');
  if (productId) {
    const updatedStockResult = await makeRequest('PATCH', `/api/tenants/${tenantId}/products/${productId}`, {
      stock: 140
    });
    if (updatedStockResult?.currentStock !== undefined) {
      console.log('   Stock atualizado para:', updatedStockResult.currentStock);
      initialStock = updatedStockResult.currentStock;
    }
  }

  // 17. Sales - Create
  console.log('\n🛒 17. Sales - Create');
  const saleData = await makeRequest('POST', `/api/tenants/${tenantId}/sales`, {
    tenantId: tenantId,
    customerId: customerId,
    professionalId: professionalId,
    paymentMethod: 'credit_card',
    items: [
      {
        serviceId: serviceId,
        quantity: 1,
        unitPrice: 45.00
      },
      {
        productId: productId,
        quantity: 2,
        unitPrice: 25.00
      }
    ]
  });

  if (saleData?.id) {
    saleId = saleData.id;
    console.log('   Sale criada:', saleId);

    // Verificar se o stock foi decrementado
    console.log('\n📦 Verificando decremento de stock...');
    const updatedProduct = await makeRequest('GET', `/api/tenants/${tenantId}/products/${productId}`);
    if (updatedProduct && updatedProduct.currentStock !== undefined) {
      const expectedStockAfterSale = initialStock - 2;
      console.log(`   Stock anterior: ${initialStock}, Stock atual: ${updatedProduct.currentStock}`);
      if (updatedProduct.currentStock === expectedStockAfterSale) {
        console.log('   ✅ Stock decrementado corretamente');
      } else {
        console.log('   ❌ Stock não foi decrementado');
      }
    }
  }

  // 18. Loyalty - Add Points
  console.log('\n🎯 18. Loyalty - Add Points');
  const addPointsResult = await makeRequest('POST', `/api/tenants/${tenantId}/customers/${customerId}/loyalty/add`, {
    points: 100,
    reason: 'Compra de teste',
    referenceId: saleId || 'test-ref'
  });

  // 19. Loyalty - Redeem Points (só se tiver pontos suficientes)
  console.log('\n🎯 19. Loyalty - Redeem Points');
  if (addPointsResult) {
    await makeRequest('POST', `/api/tenants/${tenantId}/customers/${customerId}/loyalty/redeem`, {
      points: 50,
      reason: 'Desconto em serviço',
      referenceId: appointmentId || 'test-ref'
    });
  } else {
    console.log('   ⚠️  Pulando resgate - falha ao adicionar pontos');
  }

  // 20. Automations - Create
  console.log('\n🤖 20. Automations - Create');
  const automationData = await makeRequest('POST', '/api/automations', {
    tenantId: tenantId,
    name: 'Automação de Teste',
    trigger: 'customer_inactive',
    condition: {
      lastVisitGtDays: 30
    },
    action: 'send_message',
    actionPayload: {
      message: 'Olá! Sentimos sua falta no salão.'
    },
    isActive: true
  }, { Authorization: `Bearer ${authToken}` });

  // 21. Analytics - Overview
  console.log('\n📊 21. Analytics - Overview');
  await makeRequest('GET', `/api/analytics/overview?tenantId=${tenantId}&startDate=2026-01-01&endDate=2026-12-31`, null, { Authorization: `Bearer ${authToken}` });

  // 22. Verificações finais
  console.log('\n🔍 22. Verificações finais');

  // Verificar se estoque foi decrementado
  console.log('   - Verificando estoque do produto...');
  const productAfterSale = await makeRequest('GET', `/api/tenants/${tenantId}/products/${productId}`);
  if (productAfterSale && productAfterSale.currentStock < 150) {
    console.log('   ✅ Estoque decrementado corretamente após venda');
  } else {
    console.log('   ❌ Estoque NÃO foi decrementado');
  }

  // Verificar alertas de stock
  console.log('   - Verificando alertas de stock...');
  const stockAlerts = await makeRequest('GET', `/api/tenants/${tenantId}/products/stock-alerts`);
  console.log(`   📦 Alertas de stock: ${stockAlerts?.length || 0} produtos com estoque baixo`);

  // Verificar loyalty points
  console.log('   - Verificando pontos de fidelidade...');
  const loyaltyData = await makeRequest('GET', `/api/tenants/${tenantId}/customers/${customerId}/loyalty`);
  if (loyaltyData && loyaltyData.points >= 50) {
    console.log('   ✅ Sistema de pontos funcionando');
  } else {
    console.log('   ❌ Sistema de pontos NÃO está funcionando');
  }

  // 18. Listagens para verificar se tudo foi criado
  console.log('\n📋 23. Verificação de listagens');

  const customers = await makeRequest('GET', `/api/customers?tenantId=${tenantId}`);
  console.log(`   👥 Customers criados: ${customers?.length || 0}`);

  const professionals = await makeRequest('GET', `/api/tenants/${tenantId}/professionals`);
  console.log(`   💇 Professionals criados: ${professionals?.length || 0}`);

  const services = await makeRequest('GET', `/api/tenants/${tenantId}/services`);
  console.log(`   ✂️ Services criados: ${services?.length || 0}`);

  const products = await makeRequest('GET', `/api/tenants/${tenantId}/products`);
  console.log(`   📦 Products criados: ${products?.length || 0}`);

  const appointments = await makeRequest('GET', `/api/tenants/${tenantId}/appointments`);
  console.log(`   📅 Appointments criados: ${appointments?.length || 0}`);

  const sales = await makeRequest('GET', `/api/tenants/${tenantId}/sales`);
  console.log(`   🛒 Sales criadas: ${sales?.length || 0}`);

  console.log('\n🎉 Testes finalizados!');
  console.log('\n💡 Dicas:');
  console.log('- Verifique os logs do backend para mais detalhes');
  console.log('- Execute "npm run init-db" se o banco não estiver inicializado');
  console.log('- Certifique-se que o Redis está rodando para funcionalidades avançadas');
}

// Executar os testes
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };