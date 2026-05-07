import { pool } from '../database/connection';
import { AutomationRepositoryImpl } from '../models/AutomationRepositoryImpl';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { AppointmentRepositoryImpl } from '../models/AppointmentRepositoryImpl';
import { Customer } from '../models/Customer';
import { Automation } from '../models/Automation';

export class AutomationEngine {
  private automationRepo = new AutomationRepositoryImpl(pool);
  private customerRepo = new CustomerRepositoryImpl(pool);
  private appointmentRepo = new AppointmentRepositoryImpl(pool);

  async runForAppointmentCompleted(tenantId: string, appointmentId: string): Promise<void> {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment || appointment.tenantId !== tenantId) {
      return;
    }

    const customer = await this.customerRepo.findById(appointment.customerId);
    if (!customer) {
      return;
    }

    const automations = await this.automationRepo.findActiveByTrigger(tenantId, 'APPOINTMENT_COMPLETED');
    for (const automation of automations) {
      if (!this.matchesAppointmentCompletedCondition(automation.condition, appointment, customer)) {
        continue;
      }
      await this.executeAction(automation, customer);
    }
  }

  async runLastVisitRules(tenantId: string): Promise<{ triggered: number }> {
    const automations = await this.automationRepo.findActiveByTrigger(tenantId, 'last_visit_gt_days');
    let triggered = 0;

    if (!automations.length) {
      return { triggered };
    }

    const customers = await this.customerRepo.findAll({ tenantId });
    for (const automation of automations) {
      const days = Number(automation.condition?.days || 0);
      if (!days || days <= 0) {
        continue;
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const candidates = customers.filter(customer => {
        const lastVisit = customer.lastVisit || new Date(0);
        const isPast = lastVisit < cutoff;
        const matchesTags = this.matchesTags(customer, automation.condition?.tags);
        return isPast && matchesTags;
      });

      for (const customer of candidates) {
        await this.executeAction(automation, customer);
        triggered += 1;
      }
    }

    return { triggered };
  }

  private matchesAppointmentCompletedCondition(
    condition: Record<string, any>,
    appointment: any,
    customer: Customer
  ): boolean {
    if (!condition) {
      return true;
    }

    if (condition.customerTags && !this.matchesTags(customer, condition.customerTags)) {
      return false;
    }

    if (condition.serviceIds && Array.isArray(condition.serviceIds)) {
      if (!condition.serviceIds.includes(appointment.serviceId)) {
        return false;
      }
    }

    return true;
  }

  private matchesTags(customer: Customer, tags?: string[] | string): boolean {
    if (!tags) return true;
    const desired = Array.isArray(tags) ? tags : [tags];
    const current = (customer.tags || []).map(tag => tag.toString().toLowerCase());
    return desired.every(tag => current.includes(tag.toString().toLowerCase()));
  }

  private async executeAction(automation: Automation, customer: Customer): Promise<void> {
    if (automation.action === 'send_whatsapp') {
      const message = automation.actionPayload?.message || 'Você tem uma novidade do BeautyFlow!';
      await pool.query(
        `INSERT INTO messages (tenant_id, customer_id, channel, content, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [automation.tenantId, customer.id, 'whatsapp', message, 'sent']
      );
      return;
    }

    if (automation.action === 'add_tag') {
      const tag = automation.actionPayload?.tag;
      if (!tag) return;
      const updatedTags = Array.from(new Set([...(customer.tags || []), tag]));
      await this.customerRepo.update(customer.id, { tags: updatedTags });
      return;
    }

    // Fallback: log the event in messages for audit
    await pool.query(
      `INSERT INTO messages (tenant_id, customer_id, channel, content, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [automation.tenantId, customer.id, 'whatsapp', `Automation ${automation.name} executed`, 'sent']
    );
  }
}
