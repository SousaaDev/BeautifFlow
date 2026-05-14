'use client'

import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import { ApiError } from '@/lib/api/client'
import {
  clearPublicBookingDraft,
  loadPublicBookingDraft,
  publicCustomerChangedEvent,
  savePublicBookingDraft,
} from '@/lib/bookingDraft'
import type { Professional, Service, Tenant } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      }
    >
      <PublicBookingPageContent />
    </Suspense>
  )
}

function PublicBookingPageContent() {
  const params = useParams()
  const slug = params.slug as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salon, setSalon] = useState<Pick<Tenant, 'id' | 'name' | 'slug'> | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])

  const router = useRouter()
  const searchParams = useSearchParams()
  const resume = searchParams.get('resume')
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loggedCustomer, setLoggedCustomer] = useState<PublicCustomer | null>(null)
  const resumeHandled = useRef(false)

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
    resumeHandled.current = false
  }, [slug])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedCustomer = window.localStorage.getItem('beautyflow_public_customer')
    if (storedCustomer) {
      try {
        const customer = JSON.parse(storedCustomer) as PublicCustomer
        setLoggedCustomer(customer)
        window.dispatchEvent(new Event(publicCustomerChangedEvent))
      } catch {
        window.localStorage.removeItem('beautyflow_public_customer')
      }
    }
  }, [])

  useEffect(() => {
    const onAuthChange = () => {
      const raw = window.localStorage.getItem('beautyflow_public_customer')
      if (!raw) {
        setLoggedCustomer(null)
        return
      }
      try {
        const customer = JSON.parse(raw) as PublicCustomer
        setLoggedCustomer(customer)
      } catch {
        setLoggedCustomer(null)
      }
    }
    window.addEventListener(publicCustomerChangedEvent, onAuthChange)
    return () => window.removeEventListener(publicCustomerChangedEvent, onAuthChange)
  }, [])

  const fetchAvailableSlots = useCallback(async (): Promise<string[]> => {
    if (!selectedService || !selectedProfessional || !selectedDate) return []

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const slots = await appointmentsApi.getAvailableSlots(
      slug,
      selectedService.id,
      selectedProfessional.id,
      dateStr
    )

    const now = new Date()
    const serviceDurationMs = (selectedService.duration || 0) * 60 * 1000

    return slots.filter((time) => {
      const [hours, minutes] = time.split(':').map(Number)
      const slotDateTime = new Date(selectedDate)
      slotDateTime.setHours(hours, minutes, 0, 0)

      const slotEndDateTime = new Date(slotDateTime.getTime() + serviceDurationMs)

      return slotEndDateTime > now
    })
  }, [slug, selectedService, selectedProfessional, selectedDate])

  useEffect(() => {
    if (!selectedService || !selectedProfessional || !selectedDate) return

    let cancelled = false
    setIsLoadingSlots(true)
    fetchAvailableSlots()
      .then((filteredSlots) => {
        if (!cancelled) setAvailableSlots(filteredSlots)
      })
      .catch(() => {
        if (!cancelled) setAvailableSlots([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchAvailableSlots, selectedService, selectedProfessional, selectedDate])

  useEffect(() => {
    if (step !== 'datetime') return
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (!selectedService || !selectedProfessional || !selectedDate) return
      fetchAvailableSlots().then(setAvailableSlots).catch(() => {})
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [step, fetchAvailableSlots, selectedService, selectedProfessional, selectedDate])

  useEffect(() => {
    if (resume !== '1') return
    if (resumeHandled.current) return
    if (!salon || services.length === 0 || professionals.length === 0) return

    const draft = loadPublicBookingDraft(slug)
    if (!draft) {
      resumeHandled.current = true
      router.replace(`/agendar/${slug}`, { scroll: false })
      toast.error('Não encontramos o agendamento em andamento.')
      return
    }

    const svc = services.find((s) => s.id === draft.serviceId)
    const prof = professionals.find((p) => p.id === draft.professionalId)
    if (!svc || !prof) {
      resumeHandled.current = true
      clearPublicBookingDraft(slug)
      router.replace(`/agendar/${slug}`, { scroll: false })
      toast.error('Serviço ou profissional não está mais disponível.')
      return
    }

    resumeHandled.current = true

    setSelectedService(svc)
    setSelectedProfessional(prof)
    const [y, mo, d] = draft.dateYmd.split('-').map(Number)
    if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) {
      clearPublicBookingDraft(slug)
      router.replace(`/agendar/${slug}`, { scroll: false })
      toast.error('Data inválida no rascunho.')
      return
    }
    setSelectedDate(new Date(y, mo - 1, d, 12, 0, 0, 0))
    setSelectedTime(draft.time)
    setStep('info')

    router.replace(`/agendar/${slug}`, { scroll: false })
    toast.success('Conta conectada — confirme o agendamento abaixo.')
  }, [resume, salon, services, professionals, slug, router])

  useEffect(() => {
    if (step === 'info' && !loggedCustomer) {
      setStep('datetime')
    }
  }, [step, loggedCustomer])

  const confirmLoggedBooking = async () => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime || !loggedCustomer) return

    setIsSubmitting(true)
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startTime = new Date(selectedDate)
      startTime.setHours(hours, minutes, 0, 0)

      await appointmentsApi.createPublic(slug, {
        customerId: loggedCustomer.id,
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        startTime: startTime.toISOString(),
        customerName: loggedCustomer.name,
        customerEmail: loggedCustomer.email,
        customerPhone: loggedCustomer.phone ?? undefined,
      })

      clearPublicBookingDraft(slug)
      setStep('success')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const slots = await fetchAvailableSlots()
        setAvailableSlots(slots)
        setSelectedTime(null)
        setStep('datetime')
        toast.error(
          'Esse horário não está mais disponível. Atualizamos a lista — escolha outro horário.'
        )
        return
      }
      const message = error instanceof Error ? error.message : 'Erro ao agendar'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
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

      <p className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
        Escolha servico, profissional e horario. Se voce nao estiver logado, ao clicar em{' '}
        <span className="font-medium text-foreground">Continuar</span> abrimos a tela de{' '}
        <span className="font-medium text-foreground">Entrar</span> ou{' '}
        <span className="font-medium text-foreground">Criar conta</span> para concluir. Voce tambem pode usar os botoes no topo.
      </p>

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
              <Button
                className="gap-2"
                disabled={isLoadingSlots}
                onClick={async () => {
                  setIsLoadingSlots(true)
                  try {
                    const slots = await fetchAvailableSlots()
                    setAvailableSlots(slots)
                    if (!selectedTime || !slots.includes(selectedTime)) {
                      setSelectedTime(null)
                      toast.error(
                        'Esse horário não está mais disponível. Escolha outro na lista atualizada.'
                      )
                      return
                    }
                    if (!loggedCustomer) {
                      if (!selectedService || !selectedProfessional || !selectedDate) return
                      savePublicBookingDraft(slug, {
                        v: 1,
                        serviceId: selectedService.id,
                        professionalId: selectedProfessional.id,
                        dateYmd: format(selectedDate, 'yyyy-MM-dd'),
                        time: selectedTime,
                        customerName: '',
                        customerEmail: '',
                        customerPhone: undefined,
                      })
                      router.push(`/agendar/${slug}/login?next=confirm`)
                      return
                    }
                    setStep('info')
                  } finally {
                    setIsLoadingSlots(false)
                  }
                }}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step: confirmar (somente com conta) */}
      {step === 'info' && loggedCustomer && (
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-xl font-semibold text-center">Confirmar agendamento</h2>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            <p className="font-medium">Conta: {loggedCustomer.name}</p>
            <p className="text-muted-foreground">{loggedCustomer.email}</p>
            {loggedCustomer.phone ? (
              <p className="text-muted-foreground">{loggedCustomer.phone}</p>
            ) : null}
          </div>

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

          <Button
            type="button"
            className="w-full"
            disabled={isSubmitting}
            onClick={() => void confirmLoggedBooking()}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar agendamento
          </Button>
        </div>
      )}
    </div>
  )
}
