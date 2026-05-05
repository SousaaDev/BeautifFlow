export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  tags?: string[];
  lastVisit?: Date;
  createdAt: Date;
}
