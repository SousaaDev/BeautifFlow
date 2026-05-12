'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  Package,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useTrial } from '@/hooks/use-trial'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { professionalsApi } from '@/lib/api/professionals'
import { customersApi } from '@/lib/api/customers'
import { appointmentsApi } from '@/lib/api/appointments'
import { salesApi } from '@/lib/api/sales'
import type { Professional, Customer, Appointment, Sale } from '@/lib/types'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  totalProfessionals: number
  totalCustomers: number
  todayAppointments: number
  monthlyRevenue: number
}

export default function DashboardPage() {
  const { tenant, user } = useAuth()
  const { isTrialing, formattedTime } = useTrial()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!tenant?.id) return

    const fetchData = async () => {
      try {
        const today = new Date()
        const monthStart = startOfMonth(today)
        const monthEnd = endOfMonth(today)

        const [professionals, customers, todayAppointmentsData, monthlyAppointments, sales] = await Promise.all([
          professionalsApi.list(tenant.id),
          customersApi.list(tenant.id),
          appointmentsApi.list(tenant.id, {
            startDate: startOfDay(today).toISOString(),
            endDate: endOfDay(today).toISOString(),
          }),
          appointmentsApi.list(tenant.id, {
            startDate: monthStart.toISOString(),
            endDate: monthEnd.toISOString(),
          }),
          salesApi.list(tenant.id, {
            startDate: monthStart.toISOString(),
            endDate: monthEnd.toISOString(),
          }),
        ])

        // Calculate revenue from sales
        const salesRevenue = sales.reduce((acc, sale) => acc + sale.finalAmount, 0)
        
        // Calculate revenue from completed appointments
        const appointmentsRevenue = monthlyAppointments
          .filter((apt) => apt.status === 'COMPLETED')
          .reduce((acc, apt) => acc + (apt.service?.price || 0), 0)
        
        const monthlyRevenue = salesRevenue + appointmentsRevenue

        setStats({
          totalProfessionals: professionals.length,
          totalCustomers: customers.length,
          todayAppointments: todayAppointmentsData.length,
          monthlyRevenue,
        })

        setTodayAppointments(todayAppointmentsData.slice(0, 5))
        setRecentSales(sales.slice(0, 5))
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [tenant?.id])

  const statCards = [
    {
      title: 'Profissionais',
      value: stats?.totalProfessionals ?? 0,
      icon: Users,
      href: '/dashboard/professionals',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Clientes',
      value: stats?.totalCustomers ?? 0,
      icon: UserCircle,
      href: '/dashboard/customers',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Agendamentos hoje',
      value: stats?.todayAppointments ?? 0,
      icon: Calendar,
      href: '/dashboard/appointments',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Faturamento do mes',
      value: `R$ ${(stats?.monthlyRevenue ?? 0).toFixed(2)}`,
      icon: DollarSign,
      href: '/dashboard/sales',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ]

  const formatAppointmentDetails = (appointment: Appointment) => {
    const details = [appointment.service?.name, appointment.professional?.name].filter(Boolean)
    return details.length > 0 ? details.join(' com ') : 'Sem detalhes'
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Ola, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de controle do {tenant?.name}
          </p>
        </div>

        {isTrialing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Trial ativo</p>
                <p className="text-xs text-muted-foreground">
                  Restam <span className="font-mono font-bold text-primary">{formattedTime}</span>
                </p>
              </div>
              <Button asChild size="sm" className="ml-4">
                <Link href="/dashboard/billing">Upgrade</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mb-4 dark:bg-slate-800`}>
                      <stat.icon className={`w-6 h-6 ${stat.color} dark:text-rose-400`} />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Agendamentos de hoje</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/appointments" className="gap-2">
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum agendamento para hoje</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/dashboard/appointments">Criar agendamento</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {format(new Date(appointment.startTime), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {appointment.customer?.name || 'Cliente'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {formatAppointmentDetails(appointment)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        appointment.status === 'CONFIRMED'
                          ? 'default'
                          : appointment.status === 'COMPLETED'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {appointment.status === 'SCHEDULED' && 'Agendado'}
                      {appointment.status === 'CONFIRMED' && 'Confirmado'}
                      {appointment.status === 'IN_PROGRESS' && 'Em andamento'}
                      {appointment.status === 'COMPLETED' && 'Concluido'}
                      {appointment.status === 'CANCELED' && 'Cancelado'}
                      {appointment.status === 'NO_SHOW' && 'Nao compareceu'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Vendas recentes</CardTitle>
              <CardDescription>Ultimas transacoes do mes</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/sales" className="gap-2">
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma venda registrada</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/dashboard/sales">Registrar venda</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {sale.customer?.name || 'Cliente avulso'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sale.createdAt), "d MMM 'as' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        R$ {sale.finalAmount.toFixed(2)}
                      </p>
                      <Badge
                        variant={sale.paymentStatus === 'PAID' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {sale.paymentStatus === 'PAID' && 'Pago'}
                        {sale.paymentStatus === 'PENDING' && 'Pendente'}
                        {sale.paymentStatus === 'REFUNDED' && 'Reembolsado'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acoes rapidas</CardTitle>
          <CardDescription>Atalhos para as funcoes mais usadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              asChild
              variant="outline"
              className="h-auto py-6 flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 text-slate-950 shadow-xl shadow-slate-900/10 transition hover:bg-slate-100 focus-visible:ring-ring/50 focus-visible:ring-2 dark:border-slate-700 dark:bg-slate-950/95 dark:text-white dark:shadow-slate-950/30 dark:hover:bg-slate-900"
            >
              <Link href="/dashboard/appointments?new=true">
                <Calendar className="w-6 h-6 text-rose-400" />
                <span>Novo agendamento</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto py-6 flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 text-slate-950 shadow-xl shadow-slate-900/10 transition hover:bg-slate-100 focus-visible:ring-ring/50 focus-visible:ring-2 dark:border-slate-700 dark:bg-slate-950/95 dark:text-white dark:shadow-slate-950/30 dark:hover:bg-slate-900"
            >
              <Link href="/dashboard/customers?new=true">
                <UserCircle className="w-6 h-6 text-rose-400" />
                <span>Novo cliente</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto py-6 flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 text-slate-950 shadow-xl shadow-slate-900/10 transition hover:bg-slate-100 focus-visible:ring-ring/50 focus-visible:ring-2 dark:border-slate-700 dark:bg-slate-950/95 dark:text-white dark:shadow-slate-950/30 dark:hover:bg-slate-900"
            >
              <Link href="/dashboard/sales?new=true">
                <DollarSign className="w-6 h-6 text-rose-400" />
                <span>Registrar venda</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto py-6 flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 text-slate-950 shadow-xl shadow-slate-900/10 transition hover:bg-slate-100 focus-visible:ring-ring/50 focus-visible:ring-2 dark:border-slate-700 dark:bg-slate-950/95 dark:text-white dark:shadow-slate-950/30 dark:hover:bg-slate-900"
            >
              <Link href="/dashboard/products">
                <Package className="w-6 h-6 text-rose-400" />
                <span>Ver estoque</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
