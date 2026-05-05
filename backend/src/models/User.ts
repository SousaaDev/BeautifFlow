export interface User {
  id: string;
  tenantId?: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}
