import { Pool } from 'pg';
import { User } from './User';
import { UserRepository } from './UserRepository';

export class UserRepositoryImpl implements UserRepository {
  constructor(private pool: Pool) {}

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const query = `
      INSERT INTO users (tenant_id, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, tenant_id, email, password_hash, role, created_at
    `;
    const values = [user.tenantId || null, user.email, user.passwordHash, user.role];
    const result = await this.pool.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows.length ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length ? this.mapRowToUser(result.rows[0]) : null;
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
    };
  }
}
