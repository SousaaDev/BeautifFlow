export interface AnalyticsOverview {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    total: number;
    fromServices: number;
    fromProducts: number;
    fromSubscriptions: number;
  };
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
  };
  averageTicket: number;
}

export interface RetentionMetrics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  retentionRate: number;
  repeatCustomers: number;
  newCustomers: number;
  customersWhoReturned: number;
  averageDaysBetweenVisits: number;
}

export interface ChurnMetrics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  churnRate: number;
  customersLost: number;
  inactiveThresholdDays: number;
  inactiveCustomers: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  totalSpent: number;
  appointmentCount: number;
  lastVisit: Date;
  tags: string[];
}

export interface TopService {
  serviceId: string;
  serviceName: string;
  timesBooked: number;
  totalRevenue: number;
  averagePrice: number;
}
