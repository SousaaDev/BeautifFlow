import { CronJob } from 'cron';
import { pool } from '../database/connection';
import { AutomationEngine } from '../services/AutomationEngine';

const automationEngine = new AutomationEngine();

export class WorkerService {
  // Executa automações de retenção a cada 6 horas
  static startRetentionWorker(): void {
    const job = new CronJob('0 */6 * * *', async () => {
      console.log('[Worker] Running retention automations...');
      try {
        const tenantsResult = await pool.query('SELECT DISTINCT tenant_id FROM automations WHERE is_active = true');
        for (const row of tenantsResult.rows) {
          const tenantId = row.tenant_id;
          const result = await automationEngine.runLastVisitRules(tenantId);
          console.log(`[Worker] Triggered ${result.triggered} automation(s) for tenant ${tenantId}`);
        }
      } catch (error) {
        console.error('[Worker] Retention automations failed:', error);
      }
    });
    job.start();
    console.log('[Worker] Retention automation worker started (every 6 hours)');
  }

  // Executa relatórios pesados a cada 24 horas
  static startAnalyticsWorker(): void {
    const job = new CronJob('0 0 * * *', async () => {
      console.log('[Worker] Generating daily analytics summaries...');
      try {
        const tenantsResult = await pool.query('SELECT id FROM beauty_shops');
        for (const row of tenantsResult.rows) {
          const tenantId = row.id;
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const query = `
            SELECT tenant_id, SUM(total) as daily_revenue, COUNT(*) as appointment_count
            FROM sales
            WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3
            GROUP BY tenant_id
          `;
          const result = await pool.query(query, [tenantId, yesterday, now]);

          if (result.rows.length > 0) {
            const summary = result.rows[0];
            console.log(`[Worker] Tenant ${tenantId}: Revenue R$ ${summary.daily_revenue}, ${summary.appointment_count} appointments`);
          }
        }
      } catch (error) {
        console.error('[Worker] Analytics generation failed:', error);
      }
    });
    job.start();
    console.log('[Worker] Analytics worker started (daily at 00:00)');
  }

  // Limpa dados antigos a cada semana (LGPD compliance)
  static startCleanupWorker(): void {
    const job = new CronJob('0 2 * * 0', async () => {
      console.log('[Worker] Running LGPD cleanup...');
      try {
        const result = await pool.query(`
          DELETE FROM audit_logs
          WHERE created_at < NOW() - INTERVAL '1 year'
        `);
        console.log(`[Worker] Deleted ${result.rowCount} old audit logs`);
      } catch (error) {
        console.error('[Worker] LGPD cleanup failed:', error);
      }
    });
    job.start();
    console.log('[Worker] LGPD cleanup worker started (weekly on Sunday 02:00)');
  }

  // Completa agendamentos automaticamente quando passam do horário
  static startAppointmentCompletionWorker(): void {
    const job = new CronJob('*/5 * * * *', async () => { // A cada 5 minutos
      console.log('[Worker] Checking for appointments to complete...');
      try {
        const query = `
          UPDATE appointments
          SET status = 'COMPLETED'
          WHERE status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
            AND end_time < NOW()
        `;
        const result = await pool.query(query);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`[Worker] Auto-completed ${result.rowCount} appointment(s)`);
        }
      } catch (error) {
        console.error('[Worker] Appointment completion failed:', error);
      }
    });
    job.start();
    console.log('[Worker] Appointment completion worker started (every 5 minutes)');
  }

  static startAllWorkers(): void {
    this.startRetentionWorker();
    this.startAnalyticsWorker();
    this.startCleanupWorker();
    this.startAppointmentCompletionWorker();
    console.log('[Worker] All background jobs started');
  }
}
