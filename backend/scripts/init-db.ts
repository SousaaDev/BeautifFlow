import 'dotenv/config';
import { pool } from '../src/database/connection';

const createTables = async () => {
  try {
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create beauty_shops table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS beauty_shops (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        trial_ends_at TIMESTAMP,
        business_hours JSONB,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure settings exists on existing tables too
    await pool.query(`
      ALTER TABLE beauty_shops
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES beauty_shops(id),
        name VARCHAR(200),
        email VARCHAR(200) UNIQUE NOT NULL,
        password_hash VARCHAR(200) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(200);`);

    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(200),
        password_hash VARCHAR(200),
        tags TEXT[],
        last_visit TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`);
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(200);`);

    // Create professionals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professionals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        commission_rate DECIMAL(5,2) DEFAULT 0.00,
        buffer_minutes INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        name VARCHAR(100) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        commission_rate DECIMAL(5, 2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Create appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        customer_id UUID REFERENCES customers(id),
        professional_id UUID REFERENCES professionals(id),
        service_id UUID REFERENCES services(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        internal_notes TEXT,
        price_charged DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        name VARCHAR(200) NOT NULL,
        current_stock INTEGER DEFAULT 0,
        min_threshold INTEGER DEFAULT 5,
        cost_price DECIMAL(10,2),
        sale_price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Create sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        customer_id UUID REFERENCES customers(id),
        professional_id UUID REFERENCES professionals(id),
        total DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Create sale_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID NOT NULL REFERENCES sales(id),
        product_id UUID REFERENCES products(id),
        service_id UUID REFERENCES services(id),
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL
      );
    `);

    // Create transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        type VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
        category VARCHAR(100),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        reference_id UUID,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Create automations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        name VARCHAR(200),
        trigger VARCHAR(100),
        condition JSONB,
        action VARCHAR(100),
        action_payload JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        customer_id UUID REFERENCES customers(id),
        channel VARCHAR(20) DEFAULT 'whatsapp',
        content TEXT,
        sent_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'sent'
      );
    `);

    // Create loyalty_points table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_points (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(id),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        points INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create membership_plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        billing_cycle VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'yearly')),
        services_included JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        customer_id UUID NOT NULL REFERENCES customers(id),
        plan_id VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'paused', 'expired')),
        start_date TIMESTAMP NOT NULL,
        current_period_start TIMESTAMP NOT NULL,
        current_period_end TIMESTAMP NOT NULL,
        next_billing_date TIMESTAMP NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        gateway_subscription_id VARCHAR(255),
        metadata JSONB,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create loyalty_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(id),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        type VARCHAR(10) NOT NULL CHECK (type IN ('EARNED', 'REDEEMED')),
        points INTEGER NOT NULL,
        reason VARCHAR(255),
        reference_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create stock_movements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        product_id UUID NOT NULL REFERENCES products(id),
        type VARCHAR(15) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
        quantity INTEGER NOT NULL,
        reason TEXT,
        reference_id UUID,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default tenant used in tutorial examples
    await pool.query(`
      INSERT INTO beauty_shops (id, slug, name, trial_ends_at, business_hours)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'beautyflow-local',
        'BeautyFlow Local Demo',
        NOW() + INTERVAL '30 days',
        '{"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00"}'::jsonb
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_professionals_tenant ON professionals(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_start_end ON appointments(start_time, end_time);
      CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
      CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON loyalty_points(customer_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
      CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_automations_tenant ON automations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON loyalty_transactions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON stock_movements(tenant_id);
    `);

    // Create audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES beauty_shops(id),
        user_id UUID,
        action VARCHAR(20),
        resource VARCHAR(100),
        resource_id VARCHAR(255),
        changes JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    `);

    // Enable Row-Level Security (RLS) on all tenant-scoped tables
    await pool.query(`ALTER TABLE customers ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE sales ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE services ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE products ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE automations ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;`);

    // Create RLS policies for multi-tenant isolation
    // Customers RLS: each tenant can only see their own customers
    await pool.query(`
      CREATE POLICY tenant_isolation_customers ON customers
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {}); // Ignore if policy already exists

    // Appointments RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_appointments ON appointments
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Sales RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_sales ON sales
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Audit Logs RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_audit ON audit_logs
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Professionals RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_professionals ON professionals
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Services RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_services ON services
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Products RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_products ON products
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Transactions RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_transactions ON transactions
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Automations RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_automations ON automations
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Messages RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_messages ON messages
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Loyalty Points RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_loyalty ON loyalty_points
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Membership Plans RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_plans ON membership_plans
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Subscriptions RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_subscriptions ON subscriptions
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Sale Items RLS (inherits tenant_id from sale)
    await pool.query(`
      CREATE POLICY tenant_isolation_sale_items ON sale_items
      USING (sale_id IN (
        SELECT id FROM sales WHERE tenant_id = current_setting('app.tenant_id')::uuid
      ))
      WITH CHECK (sale_id IN (
        SELECT id FROM sales WHERE tenant_id = current_setting('app.tenant_id')::uuid
      ));
    `).catch(() => {});

    // Loyalty Transactions RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_loyalty_transactions ON loyalty_transactions
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    // Stock Movements RLS
    await pool.query(`
      CREATE POLICY tenant_isolation_stock_movements ON stock_movements
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    `).catch(() => {});

    console.log('Database tables, indexes, RLS policies, and audit logs created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
};

createTables();