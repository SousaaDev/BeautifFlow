export interface User {
  id: string;
  tenantId?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}
