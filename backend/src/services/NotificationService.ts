import { pool } from '../database/connection';
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl';

export interface NotificationSettings {
  newAppointments: boolean;
  cancellations: boolean;
  weeklyReports: boolean;
}

export class NotificationService {
  private tenantRepo = new TenantRepositoryImpl(pool);

  async notifyNewAppointment(tenantId: string, appointmentDetails: {
    customerName: string;
    serviceName: string;
    professionalName: string;
    startTime: string;
  }): Promise<void> {
    const settings = await this.getNotificationSettings(tenantId);
    if (!settings.newAppointments) return;

    const message = `🔔 Novo agendamento!\n\n` +
      `👤 Cliente: ${appointmentDetails.customerName}\n` +
      `💇 Serviço: ${appointmentDetails.serviceName}\n` +
      `👨‍💼 Profissional: ${appointmentDetails.professionalName}\n` +
      `📅 Horário: ${new Date(appointmentDetails.startTime).toLocaleString('pt-BR')}`;

    await this.sendNotification(tenantId, message, 'new_appointment');
  }

  async notifyCancellation(tenantId: string, appointmentDetails: {
    customerName: string;
    serviceName: string;
    professionalName: string;
    startTime: string;
  }): Promise<void> {
    const settings = await this.getNotificationSettings(tenantId);
    if (!settings.cancellations) return;

    const message = `❌ Agendamento cancelado!\n\n` +
      `👤 Cliente: ${appointmentDetails.customerName}\n` +
      `💇 Serviço: ${appointmentDetails.serviceName}\n` +
      `👨‍💼 Profissional: ${appointmentDetails.professionalName}\n` +
      `📅 Horário: ${new Date(appointmentDetails.startTime).toLocaleString('pt-BR')}`;

    await this.sendNotification(tenantId, message, 'cancellation');
  }

  async notifyWeeklyReport(tenantId: string, reportData: {
    totalAppointments: number;
    totalRevenue: number;
    newCustomers: number;
  }): Promise<void> {
    const settings = await this.getNotificationSettings(tenantId);
    if (!settings.weeklyReports) return;

    const message = `📊 Relatório semanal!\n\n` +
      `📅 Período: ${this.getLastWeekRange()}\n` +
      `💇 Agendamentos: ${reportData.totalAppointments}\n` +
      `💰 Receita: R$ ${reportData.totalRevenue.toFixed(2)}\n` +
      `👥 Novos clientes: ${reportData.newCustomers}`;

    await this.sendNotification(tenantId, message, 'weekly_report');
  }

  private async getNotificationSettings(tenantId: string): Promise<NotificationSettings> {
    const tenant = await this.tenantRepo.findById(tenantId);
    const settings = tenant?.settings || {};

    return settings.notifications || {
      newAppointments: true,
      cancellations: true,
      weeklyReports: false,
    };
  }

  private async sendNotification(tenantId: string, message: string, type: string): Promise<void> {
    // Por enquanto, salva na tabela messages como notificação para o dono
    // TODO: Integrar com WhatsApp API ou email quando disponível
    await pool.query(
      `INSERT INTO messages (tenant_id, customer_id, channel, content, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, null, 'notification', message, 'pending', JSON.stringify({ type, forOwner: true })]
    );

    console.log(`📤 Notificação ${type} enviada para tenant ${tenantId}: ${message}`);
  }

  private getLastWeekRange(): string {
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);

    return `${lastWeek.toLocaleDateString('pt-BR')} - ${now.toLocaleDateString('pt-BR')}`;
  }
}