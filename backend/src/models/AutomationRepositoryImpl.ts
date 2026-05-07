import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Automation } from './Automation';
import { AutomationRepository } from './AutomationRepository';

export class AutomationRepositoryImpl implements AutomationRepository {
  constructor(private pool: Pool) {}

  async create(automation: Omit<Automation, 'id' | 'createdAt'>): Promise<Automation> {
    const id = uuidv4();
    const query = `
      INSERT INTO automations (id, tenant_id, name, trigger, condition, action, action_payload, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tenant_id as "tenantId", name, trigger, condition, action, action_payload as "actionPayload", is_active as "isActive", created_at as "createdAt"
    `;
    const values = [
      id,
      automation.tenantId,
      automation.name,
      automation.trigger,
      JSON.stringify(automation.condition || {}),
      automation.action,
      automation.actionPayload ? JSON.stringify(automation.actionPayload) : null,
      automation.isActive,
    ];
    const result = await this.pool.query(query, values);
    return this.mapRowToAutomation(result.rows[0]);
  }

  async findById(id: string): Promise<Automation | null> {
    const result = await this.pool.query(`
      SELECT id, tenant_id as "tenantId", name, trigger, condition, action, action_payload as "actionPayload", is_active as "isActive", created_at as "createdAt"
      FROM automations
      WHERE id = $1
    `, [id]);
    return result.rows.length ? this.mapRowToAutomation(result.rows[0]) : null;
  }

  async findByTenant(tenantId: string): Promise<Automation[]> {
    const result = await this.pool.query(`
      SELECT id, tenant_id as "tenantId", name, trigger, condition, action, action_payload as "actionPayload", is_active as "isActive", created_at as "createdAt"
      FROM automations
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `, [tenantId]);
    return result.rows.map(row => this.mapRowToAutomation(row));
  }

  async findActiveByTrigger(tenantId: string, trigger: string): Promise<Automation[]> {
    const result = await this.pool.query(`
      SELECT id, tenant_id as "tenantId", name, trigger, condition, action, action_payload as "actionPayload", is_active as "isActive", created_at as "createdAt"
      FROM automations
      WHERE tenant_id = $1 AND trigger = $2 AND is_active = true
      ORDER BY created_at DESC
    `, [tenantId, trigger]);
    return result.rows.map(row => this.mapRowToAutomation(row));
  }

  async update(id: string, automation: Partial<Automation>): Promise<Automation> {
    const fields: string[] = [];
    const values: any[] = [];

    if (automation.name !== undefined) {
      fields.push(`name = $${values.length + 1}`);
      values.push(automation.name);
    }
    if (automation.trigger !== undefined) {
      fields.push(`trigger = $${values.length + 1}`);
      values.push(automation.trigger);
    }
    if (automation.condition !== undefined) {
      fields.push(`condition = $${values.length + 1}`);
      values.push(JSON.stringify(automation.condition));
    }
    if (automation.action !== undefined) {
      fields.push(`action = $${values.length + 1}`);
      values.push(automation.action);
    }
    if (automation.actionPayload !== undefined) {
      fields.push(`action_payload = $${values.length + 1}`);
      values.push(JSON.stringify(automation.actionPayload));
    }
    if (automation.isActive !== undefined) {
      fields.push(`is_active = $${values.length + 1}`);
      values.push(automation.isActive);
    }

    if (!fields.length) {
      return this.findById(id) as Promise<Automation>;
    }

    values.push(id);
    const query = `
      UPDATE automations
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, tenant_id as "tenantId", name, trigger, condition, action, action_payload as "actionPayload", is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, values);
    if (!result.rows.length) {
      throw new Error('Automation not found');
    }
    return this.mapRowToAutomation(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM automations WHERE id = $1', [id]);
  }

  private mapRowToAutomation(row: any): Automation {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      trigger: row.trigger,
      condition: row.condition || {},
      action: row.action,
      actionPayload: row.actionPayload || undefined,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }
}
