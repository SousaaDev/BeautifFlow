import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Subscription } from './Subscription';
import { SubscriptionRepository, SubscriptionFilters } from './SubscriptionRepository';

export class SubscriptionRepositoryImpl implements SubscriptionRepository {
  constructor(private pool: Pool) {}

  async create(subscription: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> {
    const id = uuidv4();
    const result = await this.pool.query(
      `INSERT INTO subscriptions (id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at`,
      [
        id,
        subscription.tenantId,
        subscription.customerId,
        subscription.planId,
        subscription.status,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        subscription.externalSubscriptionId || null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at
       FROM subscriptions
       WHERE id = $1`,
      [id]
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  async findByExternalSubscriptionId(externalSubscriptionId: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at
       FROM subscriptions
       WHERE external_subscription_id = $1
       LIMIT 1`,
      [externalSubscriptionId]
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  async findByTenant(filters: SubscriptionFilters): Promise<Subscription[]> {
    const values: any[] = [filters.tenantId];
    const conditions = ['tenant_id = $1'];

    if (filters.customerId) {
      values.push(filters.customerId);
      conditions.push(`customer_id = $${values.length}`);
    }

    const result = await this.pool.query(
      `SELECT id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at
       FROM subscriptions
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      values
    );
    return result.rows.map((row: any) => this.mapRow(row));
  }

  async findByTenantAndCustomer(tenantId: string, customerId: string): Promise<Subscription[]> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at
       FROM subscriptions
       WHERE tenant_id = $1 AND customer_id = $2
       ORDER BY created_at DESC`,
      [tenantId, customerId]
    );
    return result.rows.map((row: any) => this.mapRow(row));
  }

  async findActiveByCustomer(tenantId: string, customerId: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at
       FROM subscriptions
       WHERE tenant_id = $1 AND customer_id = $2 AND status = 'active' AND current_period_end >= NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, customerId]
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  async findActiveByTenant(tenantId: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at
       FROM subscriptions
       WHERE tenant_id = $1 AND status = 'active' AND current_period_end >= NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId]
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const fields: string[] = [];
    const values: any[] = [];
    let param = 1;

    if (data.planId !== undefined) {
      fields.push(`plan_id = $${param++}`);
      values.push(data.planId);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${param++}`);
      values.push(data.status);
    }
    if (data.currentPeriodStart !== undefined) {
      fields.push(`current_period_start = $${param++}`);
      values.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== undefined) {
      fields.push(`current_period_end = $${param++}`);
      values.push(data.currentPeriodEnd);
    }
    if (data.externalSubscriptionId !== undefined) {
      fields.push(`external_subscription_id = $${param++}`);
      values.push(data.externalSubscriptionId);
    }

    if (!fields.length) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Subscription not found');
      }
      return existing;
    }

    values.push(id);
    const query = `
      UPDATE subscriptions
      SET ${fields.join(', ')}
      WHERE id = $${param}
      RETURNING id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, external_subscription_id, created_at
    `;

    const result = await this.pool.query(query, values);
    if (!result.rows.length) {
      throw new Error('Subscription not found');
    }
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
  }

  private mapRow(row: any): Subscription {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      customerId: row.customer_id,
      planId: row.plan_id,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      externalSubscriptionId: row.external_subscription_id,
      createdAt: row.created_at,
    };
  }
}
