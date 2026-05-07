export interface Automation {
  id: string;
  tenantId: string;
  name: string;
  trigger: string;
  condition: Record<string, any>;
  action: string;
  actionPayload?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}
