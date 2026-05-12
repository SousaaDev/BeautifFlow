export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  passwordHash?: string;
  tags?: string[];
  lastVisit?: Date;
  createdAt: Date;
  deletedAt?: Date; // Soft delete field for LGPD compliance
}
