'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  CheckCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { format, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { publicApi } from '@/lib/api/public'
import { appointmentsApi } from '@/lib/api/appointments'
import type { Professional, Service, Tenant } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const bookingSchema = z.object({
  customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  customerEmail: z.string().email('Email invalido'),
  customerPhone: z.string().optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

type PublicCustomer = {
  id: string
  name: string
  email: string
  phone?: string | null
  token: string
}

type Step = 'service' | 'professional' | 'datetime' | 'info' | 'success'

const formatPrice = (value: number | string | null | undefined) => Number(value ?? 0).toFixed(2)

export default function PublicBookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salon, setSalon] = useState<Pick<Tenant, 'id' | 'name' | 'slug'> | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])

  const router = useRouter()
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loggedCustomer, setLoggedCustomer] = useState<PublicCustomer | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  })

  useEffect(() => {
    const loadSalonData = async () => {
      try {
        const data = await publicApi.getSalonData(slug)
        setSalon(data.tenant)
        setProfessionals(data.professionals)
        setServices(data.services)
      } catch (error) {
        setError('Salao nao encontrado')
      } finally {
        setIsLoading(false)
      }
    }

    loadSalonData()
  }, [slug])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedCustomer = window.localStorage.getItem('beautyflow_public_customer')
    if (storedCustomer) {
      try {
        const customer = JSON.parse(storedCustomer) as PublicCustomer
        setLoggedCustomer(customer)
        reset({
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone ?? undefined,
        })
      } catch {
        window.localStorage.removeItem('beautyflow_public_customer')
      }
    }
  }, [reset])

  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!selectedService || !selectedProfessional || !selectedDate) return

      setIsLoadingSlots(true)
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const slots = await appointmentsApi.getAvailableSlots(
          slug,
          selectedService.id,
          selectedProfessional.id,
          dateStr
        )
        
        // Filtrar horários que já passaram ou que não têm tempo suficiente
        const now = new Date()
        const serviceDurationMs = (selectedService.duration || 0) * 60 * 1000
        
        const filteredSlots = slots.filter((time) => {
          const [hours, minutes] = time.split(':').map(Number)
          const slotDateTime = new Date(selectedDate)
          slotDateTime.setHours(hours, minutes, 0, 0)
          
          // Calcular quando o slot terminaria
          const slotEndDateTime = new Date(slotDateTime.getTime() + serviceDurationMs)
          
          // Remover horários que já passaram ou que não podem ser completados
          return slotEndDateTime > now
        })
        
        setAvailableSlots(filteredSlots)
      } catch (error) {
        setAvailableSlots([])
      } finally {
        setIsLoadingSlots(false)
      }
    }

    loadAvailableSlots()
  }, [slug, selectedService, selectedProfessional, selectedDate])

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) return

    setIsSubmitting(true)
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startTime = new Date(selectedDate)
      startTime.setHours(hours, minutes, 0, 0)

      await appointmentsApi.createPublic(slug, {
        customerId: loggedCustomer?.id ?? '',
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        startTime: startTime.toISOString(),
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
      })

      setStep('success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao agendar'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const logoutCustomer = () => {
    window.localStorage.removeItem('beautyflow_public_customer')
    setLoggedCustomer(null)
    reset({ customerName: '', customerEmail: '', customerPhone: undefined })
  }

  const goBack = () => {
    if (step === 'professional') {
      setStep('service')
      setSelectedProfessional(null)
    } else if (step === 'datetime') {
      setStep('professional')
      setSelectedDate(undefined)
      setSelectedTime(null)
    } else if (step === 'info') {
      setStep('datetime')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !salon) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <CardContent className="pt-12 pb-8">
          <Scissors className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Salao nao encontrado</h2>
          <p className="text-muted-foreground">
            O salao que voce esta procurando nao existe ou nao esta mais ativo.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'success') {
    return (
      <Card className="max-w-md mx-auto text-center">
        <CardContent className="pt-12 pb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Agendamento confirmado!</h2>
          <p className="text-muted-foreground mb-6">
            Voce recebera um email com os detalhes do seu agendamento.
          </p>

          <div className="text-left p-4 rounded-lg bg-muted space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servico</span>
              <span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profissional</span>
              <span className="font-medium">{selectedProfessional?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">
                {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horario</span>
              <span className="font-medium">{selectedTime}</span>
            </div>
          </div>

          <Button
            className="w-full mt-6"
            onClick={() => {
              setStep('service')
              setSelectedService(null)
              setSelectedProfessional(null)
              setSelectedDate(undefined)
              setSelectedTime(null)
            }}
          >
            Fazer outro agendamento
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">{salon.name}</h1>
        <p className="text-muted-foreground mt-2">
          Agende seu horario de forma rapida e facil
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row items-center justify-center">
        {loggedCustomer ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">Cliente logado</p>
            <p className="font-medium">{loggedCustomer.name}</p>
            <p className="text-sm">{loggedCustomer.email}</p>
            <button
              type="button"
              onClick={logoutCustomer}
              className="mt-2 text-sm text-primary underline"
            >
              Sair da conta
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/agendar/${slug}/login`)}
            >
              Ja tenho conta
            </Button>
            <Button onClick={() => router.push(`/agendar/${slug}/register`)}>
              Criar conta
            </Button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {(['service', 'professional', 'datetime', 'info'] as const).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : i < ['service', 'professional', 'datetime', 'info'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  'w-8 h-0.5',
                  i < ['service', 'professional', 'datetime', 'info'].indexOf(step)
                    ? 'bg-green-500'
                    : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Back button */}
      {step !== 'service' && (
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      )}

      {/* Step: Select Service */}
      {step === 'service' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Escolha o servico</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <Card
                key={service.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedService?.id === service.id && 'ring-2 ring-primary'
                )}
                onClick={() => {
                  setSelectedService(service)
                  setStep('professional')
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  {service.description && (
                    <CardDescription>{service.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {service.duration} min
                    </div>
                    <span className="font-bold text-lg">
                      R$ {formatPrice(service.price)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step: Select Professional */}
      {step === 'professional' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Escolha o profissional</h2>
            <Badge variant="outline">{selectedService?.name}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {professionals.map((prof) => (
              <Card
                key={prof.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedProfessional?.id === prof.id && 'ring-2 ring-primary'
                )}
                onClick={() => {
                  setSelectedProfessional(prof)
                  setStep('datetime')
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{prof.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step: Select Date & Time */}
      {step === 'datetime' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">Escolha data e horario</h2>
            <Badge variant="outline">{selectedService?.name}</Badge>
            <Badge variant="outline">{selectedProfessional?.name}</Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Selecione a data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    setSelectedTime(null)
                  }}
                  disabled={(date) => date < startOfDay(new Date())}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horarios disponiveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Selecione uma data primeiro
                  </p>
                ) : isLoadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum horario disponivel para esta data
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedDate && selectedTime && (
            <div className="flex justify-end">
              <Button onClick={() => setStep('info')} className="gap-2">
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step: Customer Info */}
      {step === 'info' && (
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-xl font-semibold text-center">Seus dados</h2>

          {loggedCustomer && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-medium">Você está logado como {loggedCustomer.name}</p>
              <p className="text-muted-foreground">O agendamento será registrado com sua conta.</p>
            </div>
          )}

          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servico</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profissional</span>
                <span className="font-medium">{selectedProfessional?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data e horario</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, "d/MM", { locale: ptBR })} as {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-bold">R$ {formatPrice(selectedService?.price)}</span>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nome completo *</Label>
              <Input id="customerName" {...register('customerName')} />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email *</Label>
              <Input id="customerEmail" type="email" {...register('customerEmail')} />
              {errors.customerEmail && (
                <p className="text-sm text-destructive">{errors.customerEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Telefone</Label>
              <Input id="customerPhone" {...register('customerPhone')} />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar agendamento
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
