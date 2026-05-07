import { pool } from '../database/connection';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AuditService {
  async logAction(
    tenantId: string,
    action: string,
    resource: string,
    resourceId: string,
    changes: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, resource, resource_id, changes, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          userId || null,
          action,
          resource,
          resourceId,
          JSON.stringify(changes),
          ipAddress || null,
          userAgent || null,
        ]
      );
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }

  async getLogs(tenantId: string, resource?: string, limit: number = 100): Promise<AuditLog[]> {
    let query = `
      SELECT id, tenant_id as "tenantId", user_id as "userId", action, resource, resource_id as "resourceId",
             changes, ip_address as "ipAddress", user_agent as "userAgent", created_at as "createdAt"
      FROM audit_logs
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (resource) {
      query += ` AND resource = $${params.length + 1}`;
      params.push(resource);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export const auditService = new AuditService();
