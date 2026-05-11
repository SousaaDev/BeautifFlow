export interface Tenant {
  id: string;
  slug: string;
  name: string;
  trialEndsAt?: Date;
  businessHours: Record<string, string>;
  settings?: Record<string, any>;
  createdAt: Date;
}