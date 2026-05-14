export interface Professional {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  commissionRate: number;
  bufferMinutes: number;
  workingHours?: Record<string, { isWorking: boolean; start: string; end: string }>; // day -> working hours
  isActive: boolean;
  createdAt: Date;
  /** Serviços que o profissional realiza; vazio = nenhum (defina na edição). */
  serviceIds?: string[];
}
