export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  /** Data completa (YYYY-MM-DD); na UI do salão exibir só dia/mês como aniversário */
  birthDate?: string | null;
  passwordHash?: string;
  tags?: string[];
  lastVisit?: Date;
  createdAt: Date;
  deletedAt?: Date; // Soft delete field for LGPD compliance
}
