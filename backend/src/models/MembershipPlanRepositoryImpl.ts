import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { MembershipPlan, MembershipServiceIncluded } from './MembershipPlan';
import { MembershipPlanRepository } from './MembershipPlanRepository';

export class MembershipPlanRepositoryImpl implements MembershipPlanRepository {
  constructor(private pool: Pool) {}

  async create(plan: Omit<MembershipPlan, 'id' | 'createdAt'>): Promise<MembershipPlan> {
    const id = uuidv4();
    const result = await this.pool.query(
      `INSERT INTO membership_plans (id, tenant_id, name, description, price, billing_cycle, services_included, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, name, description, price, billing_cycle, services_included, is_active, created_at`,
      [
        id,
        plan.tenantId,
        plan.name,
        plan.description || null,
        plan.price,
        plan.billingCycle,
        JSON.stringify(plan.servicesIncluded || []),
        plan.isActive,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async findByTenant(tenantId: string): Promise<MembershipPlan[]> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, name, description, price, billing_cycle, services_included, is_active, created_at
       FROM membership_plans
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows.map((row: any) => this.mapRow(row));
  }

  async findById(id: string): Promise<MembershipPlan | null> {
    const result = await this.pool.query(
      `SELECT id, tenant_id, name, description, price, billing_cycle, services_included, is_active, created_at
       FROM membership_plans
       WHERE id = $1`,
      [id]
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  async update(id: string, plan: Partial<MembershipPlan>): Promise<MembershipPlan> {
    const fields: string[] = [];
    const values: any[] = [];
    let param = 1;

    if (plan.name !== undefined) {
      fields.push(`name = $${param++}`);
      values.push(plan.name);
    }
    if (plan.description !== undefined) {
      fields.push(`description = $${param++}`);
      values.push(plan.description);
    }
    if (plan.price !== undefined) {
      fields.push(`price = $${param++}`);
      values.push(plan.price);
    }
    if (plan.billingCycle !== undefined) {
      fields.push(`billing_cycle = $${param++}`);
      values.push(plan.billingCycle);
    }
    if (plan.servicesIncluded !== undefined) {
      fields.push(`services_included = $${param++}`);
      values.push(JSON.stringify(plan.servicesIncluded));
    }
    if (plan.isActive !== undefined) {
      fields.push(`is_active = $${param++}`);
      values.push(plan.isActive);
    }

    if (!fields.length) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Membership plan not found');
      }
      return existing;
    }

    const query = `
      UPDATE membership_plans
      SET ${fields.join(', ')}
      WHERE id = $${param}
      RETURNING id, tenant_id, name, description, price, billing_cycle, services_included, is_active, created_at
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    if (!result.rows.length) {
      throw new Error('Membership plan not found');
    }
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): MembershipPlan {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      billingCycle: row.billing_cycle,
      servicesIncluded: (row.services_included || []) as MembershipServiceIncluded[],
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
