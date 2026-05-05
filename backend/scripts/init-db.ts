import 'dotenv/config';
import { pool } from '../src/database/connection';

const createTables = async () => {
  try {
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create barbershops table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barbershops (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        trial_ends_at TIMESTAMP,
        business_hours JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(200),
        tags TEXT[],
        last_visit TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create barbers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barbers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        commission_rate DECIMAL(5,2) DEFAULT 0.00,
        buffer_minutes INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        name VARCHAR(100) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        commission_rate DECIMAL(5, 2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        customer_id UUID REFERENCES customers(id),
        barber_id UUID REFERENCES barbers(id),
        service_id UUID REFERENCES services(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        internal_notes TEXT,
        price_charged DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        name VARCHAR(200) NOT NULL,
        current_stock INTEGER DEFAULT 0,
        min_threshold INTEGER DEFAULT 5,
        cost_price DECIMAL(10,2),
        sale_price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        customer_id UUID REFERENCES customers(id),
        barber_id UUID REFERENCES barbers(id),
        total DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

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
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        type VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
        category VARCHAR(100),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        reference_id UUID,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create automations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        name VARCHAR(200),
        trigger VARCHAR(100),
        condition JSONB,
        action VARCHAR(100),
        action_payload JSONB,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
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
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        points INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create membership_plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
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
        customer_id UUID NOT NULL REFERENCES customers(id),
        tenant_id UUID NOT NULL REFERENCES barbershops(id),
        plan_id UUID NOT NULL REFERENCES membership_plans(id),
        status VARCHAR(20) CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        external_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
};

createTables();