import { Pool } from 'pg';
import {
  AnalyticsOverview,
  RetentionMetrics,
  ChurnMetrics,
  TopCustomer,
  TopService,
} from './Analytics';

export class AnalyticsRepositoryImpl {
  constructor(private pool: Pool) {}

  async getOverview(tenantId: string, startDate: Date, endDate: Date): Promise<AnalyticsOverview> {
    const totalRevenueResult = await this.pool.query(`
      SELECT
        COALESCE(SUM(s.total), 0) as total,
        COALESCE(SUM(CASE WHEN si.service_id IS NOT NULL THEN si.unit_price * si.quantity ELSE 0 END), 0) as from_services,
        COALESCE(SUM(CASE WHEN si.product_id IS NOT NULL THEN si.unit_price * si.quantity ELSE 0 END), 0) as from_products,
        0 as from_subscriptions
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.tenant_id = $1 AND s.created_at >= $2 AND s.created_at <= $3
    `, [tenantId, startDate, endDate]);

    const completedAppointmentsRevenueResult = await this.pool.query(`
      SELECT COALESCE(SUM(price_charged), 0) as total
      FROM appointments
      WHERE tenant_id = $1
        AND status = 'completed'
        AND start_time >= $2
        AND start_time <= $3
    `, [tenantId, startDate, endDate]);

    const appointmentResult = await this.pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
      FROM appointments
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
    `, [tenantId, startDate, endDate]);

    const customerResult = await this.pool.query(`
      SELECT
        COUNT(DISTINCT id) as total,
        SUM(CASE WHEN created_at >= $2 AND created_at <= $3 THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN created_at < $2 AND last_visit >= $2 AND last_visit <= $3 THEN 1 ELSE 0 END) as returning
      FROM customers
      WHERE tenant_id = $1
    `, [tenantId, startDate, endDate]);

    const completedAppointmentRevenue = parseFloat(completedAppointmentsRevenueResult.rows[0]?.total || 0);
    const totalRevenue = parseFloat(totalRevenueResult.rows[0]?.total || 0) + completedAppointmentRevenue;
    const appointmentCount = parseInt(appointmentResult.rows[0]?.total || 0);
    const averageTicket = appointmentCount > 0 ? totalRevenue / appointmentCount : 0;

    return {
      period: { startDate, endDate },
      revenue: {
        total: totalRevenue,
        fromServices: parseFloat(totalRevenueResult.rows[0]?.from_services || 0) + completedAppointmentRevenue,
        fromProducts: parseFloat(totalRevenueResult.rows[0]?.from_products || 0),
        fromSubscriptions: parseFloat(totalRevenueResult.rows[0]?.from_subscriptions || 0),
      },
      appointments: {
        total: appointmentCount,
        completed: parseInt(appointmentResult.rows[0]?.completed || 0),
        cancelled: parseInt(appointmentResult.rows[0]?.cancelled || 0),
        noShow: parseInt(appointmentResult.rows[0]?.no_show || 0),
      },
      customers: {
        total: parseInt(customerResult.rows[0]?.total || 0),
        new: parseInt(customerResult.rows[0]?.new || 0),
        returning: parseInt(customerResult.rows[0]?.returning || 0),
      },
      averageTicket,
    };
  }

  async getRetention(tenantId: string, startDate: Date, endDate: Date): Promise<RetentionMetrics> {
    const result = await this.pool.query(`
      WITH cohort_analysis AS (
        SELECT
          c.id,
          COUNT(DISTINCT a.id) as appointment_count,
          MAX(a.created_at) as last_appointment
        FROM customers c
        LEFT JOIN appointments a ON c.id = a.customer_id AND a.status = 'completed'
        WHERE c.tenant_id = $1 AND c.created_at < $2
        GROUP BY c.id
      ),
      metrics AS (
        SELECT
          COUNT(*) as total_customers,
          SUM(CASE WHEN appointment_count >= 2 THEN 1 ELSE 0 END) as customers_with_repeat,
          SUM(CASE WHEN last_appointment >= $2 AND last_appointment <= $3 THEN 1 ELSE 0 END) as customers_who_returned
        FROM cohort_analysis
      )
      SELECT
        total_customers,
        customers_with_repeat,
        customers_who_returned,
        ROUND(
          CASE WHEN total_customers > 0 
            THEN (customers_who_returned::float / total_customers * 100)
            ELSE 0
          END,
          2
        ) as retention_rate
      FROM metrics
    `, [tenantId, startDate, endDate]);

    const data = result.rows[0];
    return {
      period: { startDate, endDate },
      retentionRate: parseFloat(data?.retention_rate || 0),
      repeatCustomers: parseInt(data?.customers_with_repeat || 0),
      newCustomers: parseInt(data?.total_customers || 0),
      customersWhoReturned: parseInt(data?.customers_who_returned || 0),
      averageDaysBetweenVisits: 14, // placeholder
    };
  }

  async getChurn(tenantId: string, inactiveThresholdDays: number = 30): Promise<ChurnMetrics> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - inactiveThresholdDays * 24 * 60 * 60 * 1000);

    const result = await this.pool.query(`
      SELECT
        COUNT(DISTINCT id) as total_customers,
        SUM(CASE WHEN last_visit IS NULL OR last_visit < $2 THEN 1 ELSE 0 END) as inactive_count
      FROM customers
      WHERE tenant_id = $1
    `, [tenantId, cutoffDate]);

    const data = result.rows[0];
    const totalCustomers = parseInt(data?.total_customers || 0);
    const inactiveCount = parseInt(data?.inactive_count || 0);
    const churnRate = totalCustomers > 0 ? (inactiveCount / totalCustomers) * 100 : 0;

    return {
      period: {
        startDate: cutoffDate,
        endDate: now,
      },
      churnRate: Math.round(churnRate * 100) / 100,
      customersLost: inactiveCount,
      inactiveThresholdDays,
      inactiveCustomers: inactiveCount,
    };
  }

  async getTopCustomers(tenantId: string, limit: number = 10): Promise<TopCustomer[]> {
    const result = await this.pool.query(`
      SELECT
        c.id as customer_id,
        c.name as customer_name,
        c.tags,
        c.last_visit,
        COALESCE(SUM(s.total), 0) as total_spent,
        COUNT(DISTINCT a.id) as appointment_count
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id
      LEFT JOIN appointments a ON c.id = a.customer_id AND a.status = 'completed'
      WHERE c.tenant_id = $1
      GROUP BY c.id, c.name, c.tags, c.last_visit
      ORDER BY total_spent DESC
      LIMIT $2
    `, [tenantId, limit]);

    return result.rows.map(row => ({
      customerId: row.customer_id,
      customerName: row.customer_name,
      totalSpent: parseFloat(row.total_spent),
      appointmentCount: parseInt(row.appointment_count),
      lastVisit: row.last_visit,
      tags: row.tags || [],
    }));
  }

  async getTopServices(tenantId: string, limit: number = 10): Promise<TopService[]> {
    const result = await this.pool.query(`
      SELECT
        s.id as service_id,
        s.name as service_name,
        s.price,
        COUNT(DISTINCT a.id) as times_booked,
        COALESCE(SUM(a.price_charged), 0) as total_revenue
      FROM services s
      LEFT JOIN appointments a ON s.id = a.service_id AND a.tenant_id = $1
      WHERE s.tenant_id = $1
      GROUP BY s.id, s.name, s.price
      ORDER BY times_booked DESC
      LIMIT $2
    `, [tenantId, limit]);

    return result.rows.map(row => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      timesBooked: parseInt(row.times_booked),
      totalRevenue: parseFloat(row.total_revenue),
      averagePrice: parseFloat(row.price),
    }));
  }
}
