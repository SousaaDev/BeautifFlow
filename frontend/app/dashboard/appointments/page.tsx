'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  addMinutes,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useAuth } from '@/contexts/auth-context'
import { appointmentsApi } from '@/lib/api/appointments'
import { professionalsApi } from '@/lib/api/professionals'
import { customersApi } from '@/lib/api/customers'
import { servicesApi } from '@/lib/api/services'
import type { Appointment, Professional, Customer, Service, AppointmentStatus } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const appointmentSchema = z.object({
  customerId: z.string().min(1, 'Selecione um cliente'),
  professionalId: z.string().min(1, 'Selecione um profissional'),
  serviceId: z.string().min(1, 'Selecione um servico'),
  date: z.date({ required_error: 'Selecione uma data' }),
  time: z.string().min(1, 'Selecione um horario'),
  notes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

const statusColors: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELED: 'bg-red-100 text-red-800 border-red-200',
  NO_SHOW: 'bg-orange-100 text-orange-800 border-orange-200',
}

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluido',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Nao compareceu',
}

export default function AppointmentsPage() {
  const { tenant } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customerId: '',
      professionalId: '',
      serviceId: '',
      date: new Date(),
      time: '09:00',
      notes: '',
    },
  })

  const selectedServiceId = watch('serviceId')
  const selectedService = services.find((s) => s.id === selectedServiceId)

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentWeek])

  useEffect(() => {
    if (tenant?.id) {
      loadData()
    }
  }, [tenant?.id])

  useEffect(() => {
    if (tenant?.id) {
      loadAppointments()
    }
  }, [tenant?.id, currentWeek])

  const loadData = async () => {
    if (!tenant?.id) return
    try {
      const [profs, custs, servs] = await Promise.all([
        professionalsApi.list(tenant.id),
        customersApi.list(tenant.id),
        servicesApi.list(tenant.id),
      ])
      setProfessionals(profs)
      setCustomers(custs)
      setServices(servs.filter((s) => s.isActive))
    } catch (error) {
      toast.error('Erro ao carregar dados')
    }
  }

  const loadAppointments = async () => {
    if (!tenant?.id) return
    setIsLoading(true)
    try {
      const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const end = endOfWeek(currentWeek, { weekStartsOn: 1 })
      const data = await appointmentsApi.list(tenant.id, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
      setAppointments(data)

      const overdueAppointments = data.filter(
        (apt) =>
          apt.status === 'SCHEDULED' &&
          parseISO(apt.endTime) <= new Date()
      )

      if (overdueAppointments.length > 0) {
        await Promise.all(
          overdueAppointments.map((apt) =>
            appointmentsApi.update(tenant.id, apt.id, { status: 'CONFIRMED' })
          )
        )
        return loadAppointments()
      }
    } catch (error) {
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = (date?: Date) => {
    setSelectedAppointment(null)
    reset({
      customerId: '',
      professionalId: '',
      serviceId: '',
      date: date || new Date(),
      time: '09:00',
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    const startTime = parseISO(appointment.startTime)
    reset({
      customerId: appointment.customerId,
      professionalId: appointment.professionalId,
      serviceId: appointment.serviceId,
      date: startTime,
      time: format(startTime, 'HH:mm'),
      notes: appointment.notes || '',
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsDeleteDialogOpen(true)
  }

  const onSubmit = async (data: AppointmentFormData) => {
    if (!tenant?.id || !selectedService) return
    setIsSubmitting(true)

    try {
      const [hours, minutes] = data.time.split(':').map(Number)
      const startTime = new Date(data.date)
      startTime.setHours(hours, minutes, 0, 0)

      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration)

      const payload = {
        customerId: data.customerId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        internalNotes: data.notes,
      }

      if (selectedAppointment) {
        await appointmentsApi.update(tenant.id, selectedAppointment.id, payload)
        toast.success('Agendamento atualizado com sucesso')
      } else {
        await appointmentsApi.create(tenant.id, payload)
        toast.success('Agendamento criado com sucesso')
      }
      setIsDialogOpen(false)
      loadAppointments()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar agendamento'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tenant?.id || !selectedAppointment) return
    setIsSubmitting(true)

    try {
      await appointmentsApi.delete(tenant.id, selectedAppointment.id)
      toast.success('Agendamento removido com sucesso')
      setIsDeleteDialogOpen(false)
      loadAppointments()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover agendamento'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    if (!tenant?.id) return
    try {
      await appointmentsApi.update(tenant.id, appointment.id, { status })
      toast.success('Status atualizado')
      loadAppointments()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((a) => isSameDay(parseISO(a.startTime), date))
  }

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || 'Cliente'
  }

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name
  }

  const formatAppointmentDetails = (appointment: Appointment) => {
    const serviceName = appointment.service?.name || getServiceName(appointment.serviceId)
    const professionalName = appointment.professional?.name
    const details = [serviceName, professionalName].filter(Boolean)
    return details.length > 0 ? details.join(' com ') : 'Sem detalhes'
  }

  const formatAppointmentTitle = (appointment: Appointment) => {
    return appointment.customer?.name || getCustomerName(appointment.customerId)
  }

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8
    const minute = (i % 2) * 30
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }).filter((t) => {
    const hour = parseInt(t.split(':')[0])
    return hour >= 8 && hour < 20
  })

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os agendamentos do seu salao
          </p>
        </div>
        <Button onClick={() => openCreateDialog()} className="gap-2">
          <CalendarIcon className="w-4 h-4" />
          Novo agendamento
        </Button>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCurrentWeek(new Date())}
              >
                Hoje
              </Button>
            </div>
            <CardTitle className="text-lg">
              {format(weekDays[0], "d 'de' MMMM", { locale: ptBR })} -{' '}
              {format(weekDays[6], "d 'de' MMMM yyyy", { locale: ptBR })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayAppointments = getAppointmentsForDay(day)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[200px] border rounded-lg p-2',
                      isToday && 'border-primary bg-primary/5'
                    )}
                  >
                    <button
                      onClick={() => openCreateDialog(day)}
                      className="w-full text-left mb-2 hover:bg-muted rounded p-1 transition-colors"
                    >
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <p
                        className={cn(
                          'text-lg font-medium',
                          isToday && 'text-primary'
                        )}
                      >
                        {format(day, 'd')}
                      </p>
                    </button>

                    <div className="space-y-1">
                      {dayAppointments
                        .filter((apt) => parseISO(apt.startTime) >= new Date())
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((apt) => (
                          <div
                            key={apt.id}
                            className={cn(
                              'p-2 rounded text-xs border cursor-pointer hover:opacity-80 transition-opacity',
                              statusColors[apt.status]
                            )}
                            onClick={() => openEditDialog(apt)}
                          >
                            <p className="font-medium truncate">
                              {format(parseISO(apt.startTime), 'HH:mm')} - {formatAppointmentTitle(apt)}
                            </p>
                            { (apt.service?.name || getServiceName(apt.serviceId)) && (
                              <p className="truncate text-muted-foreground">
                                {apt.service?.name || getServiceName(apt.serviceId)}
                              </p>
                            ) }
                          </div>
                        ))}

                      {dayAppointments.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Sem agendamentos
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Agendamentos de hoje - {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : getAppointmentsForDay(new Date()).length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum agendamento para hoje
            </p>
          ) : (
            <div className="space-y-3">
              {getAppointmentsForDay(new Date())
                .filter((apt) => parseISO(apt.startTime) >= new Date())
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">
                          {format(parseISO(apt.startTime), 'HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(apt.endTime), 'HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatAppointmentTitle(apt)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatAppointmentDetails(apt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(apt)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDeleteDialog(apt)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedAppointment ? 'Editar agendamento' : 'Novo agendamento'}
            </DialogTitle>
            <DialogDescription>
              {selectedAppointment
                ? 'Atualize os dados do agendamento'
                : 'Crie um novo agendamento para um cliente'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerId && (
                <p className="text-sm text-destructive">{errors.customerId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Servico *</Label>
              <Controller
                name="serviceId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um servico" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - R$ {s.price.toFixed(2)} ({s.duration}min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.serviceId && (
                <p className="text-sm text-destructive">{errors.serviceId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Controller
                name="professionalId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {!p.isActive ? ' (nao aparece online)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.professionalId && (
                <p className="text-sm text-destructive">{errors.professionalId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < startOfDay(new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Horario *</Label>
                <Controller
                  name="time"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Horario" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.time && (
                  <p className="text-sm text-destructive">{errors.time.message}</p>
                )}
              </div>
            </div>

            {selectedService && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Duracao: {selectedService.duration} minutos | Valor: R${' '}
                    {selectedService.price.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Observacoes</Label>
              <Textarea
                id="notes"
                placeholder="Anotacoes sobre o agendamento..."
                {...register('notes')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedAppointment ? 'Salvar' : 'Agendar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este agendamento? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
