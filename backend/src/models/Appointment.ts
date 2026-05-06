export interface Appointment {
  id: string;
  tenantId: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  internalNotes?: string;
  priceCharged?: number;
  createdAt: Date;
}
