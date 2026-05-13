'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Users, MoreHorizontal, Pencil, Trash2, Loader2, Clock, Plus } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { professionalsApi } from '@/lib/api/professionals'
import type { Professional } from '@/lib/types'

import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const professionalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  isActive: z.boolean().default(true),
})

type ProfessionalFormData = z.infer<typeof professionalSchema>

type WorkingHoursEntry = {
  isWorking: boolean
  start: string
  end: string
}

interface ExceptionEntry {
  id: string
  date: string
  isWorking: boolean
  start: string
  end: string
}

const WEEKDAYS = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

const emptyWorkingHours = (): Record<string, WorkingHoursEntry> =>
  WEEKDAYS.reduce((acc, day) => {
    acc[day.key] = { isWorking: false, start: '', end: '' }
    return acc
  }, {} as Record<string, WorkingHoursEntry>)

const parseTenantBusinessHours = (businessHours?: Record<string, string>) => {
  const schedule = emptyWorkingHours()
  if (!businessHours) return schedule

  for (const { key } of WEEKDAYS) {
    const value = businessHours[key] || businessHours[key.slice(0, 3)]
    if (!value) continue
    const parts = value.split(/[-–—]/).map((part) => part.trim())
    schedule[key] = {
      isWorking: parts.length === 2 && parts[0] !== '' && parts[1] !== '',
      start: parts[0] ?? '',
      end: parts[1] ?? '',
    }
  }

  return schedule
}

export default function ProfessionalsPage() {
  const { tenant } = useAuth()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursEntry>>(emptyWorkingHours())
  const [exceptions, setExceptions] = useState<ExceptionEntry[]>([])

  const resetWorkingHours = () => {
    setWorkingHours(parseTenantBusinessHours(tenant?.businessHours))
    setExceptions([])
  }

  const updateWorkingHour = (day: string, field: keyof WorkingHoursEntry, value: string | boolean) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  const addException = () => {
    setExceptions((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, date: '', isWorking: true, start: '', end: '' },
    ])
  }

  const updateException = (id: string, field: keyof ExceptionEntry, value: string | boolean) => {
    setExceptions((prev) => prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
  }

  const removeException = (id: string) => {
    setExceptions((prev) => prev.filter((entry) => entry.id !== id))
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { isActive: true },
  })

  useEffect(() => {
    if (tenant?.id) {
      loadProfessionals()
    }
  }, [tenant?.id])

  useEffect(() => {
    resetWorkingHours()
  }, [tenant?.businessHours])

  const loadProfessionals = async () => {
    if (!tenant?.id) return
    try {
      const data = await professionalsApi.list(tenant.id)
      setProfessionals(data)
    } catch (error) {
      toast.error('Erro ao carregar profissionais')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setSelectedProfessional(null)
    reset({ name: '', isActive: true })
    resetWorkingHours()
    setIsDialogOpen(true)
  }

  const openEditDialog = (professional: Professional) => {
    setSelectedProfessional(professional)
    reset({
      name: professional.name,
      isActive: professional.isActive,
    })

    const defaultSchedule = parseTenantBusinessHours(tenant?.businessHours)
    const weeklySchedule = { ...defaultSchedule }
    const exceptionsList: ExceptionEntry[] = []

    if (professional.workingHours) {
      Object.entries(professional.workingHours).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase()
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedKey)) {
          exceptionsList.push({
            id: normalizedKey,
            date: normalizedKey,
            isWorking: value.isWorking,
            start: value.start,
            end: value.end,
          })
          return
        }

        const weekday = WEEKDAYS.find((day) => day.key === normalizedKey)
        if (weekday) {
          weeklySchedule[weekday.key] = value
        }
      })
    }

    setWorkingHours(weeklySchedule)
    setExceptions(exceptionsList)
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (professional: Professional) => {
    setSelectedProfessional(professional)
    setIsDeleteDialogOpen(true)
  }

  const onSubmit = async (data: ProfessionalFormData) => {
    if (!tenant?.id) return
    setIsSubmitting(true)

    try {
      const workingHoursPayload = { ...workingHours }
      exceptions.forEach((exception) => {
        if (!exception.date) return
        workingHoursPayload[exception.date] = {
          isWorking: exception.isWorking,
          start: exception.start,
          end: exception.end,
        }
      })

      const payload = {
        ...data,
        workingHours: workingHoursPayload,
      }

      if (selectedProfessional) {
        await professionalsApi.update(tenant.id, selectedProfessional.id, payload)
        toast.success('Profissional atualizado com sucesso')
      } else {
        await professionalsApi.create(tenant.id, payload)
        toast.success('Profissional criado com sucesso')
      }
      setIsDialogOpen(false)
      loadProfessionals()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar profissional'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tenant?.id || !selectedProfessional) return
    setIsSubmitting(true)

    try {
      await professionalsApi.delete(tenant.id, selectedProfessional.id)
      toast.success('Profissional removido com sucesso')
      setIsDeleteDialogOpen(false)
      loadProfessionals()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover profissional'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (p: Professional) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {p.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="font-medium">{p.name}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (p: Professional) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(p)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDeleteDialog(p)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
        <p className="text-muted-foreground">
          Gerencie os profissionais do seu salao
        </p>
      </div>

      <DataTable
        data={professionals}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar profissionais..."
        onAdd={openCreateDialog}
        addLabel="Novo profissional"
        emptyMessage="Nenhum profissional cadastrado"
        emptyIcon={<Users className="w-12 h-12 mx-auto text-muted-foreground/50" />}
        getRowKey={(p) => p.id}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProfessional ? 'Editar profissional' : 'Novo profissional'}
            </DialogTitle>
            <DialogDescription>
              {selectedProfessional
                ? 'Atualize os dados do profissional'
                : 'Adicione um novo profissional ao seu salao'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Horário do profissional</h4>
              </div>
              <div className="grid gap-4">
                {WEEKDAYS.map((day) => (
                  <div key={day.key} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">{day.label}</Label>
                      </div>
                      <Switch
                        checked={workingHours[day.key]?.isWorking}
                        onCheckedChange={(checked) => updateWorkingHour(day.key, 'isWorking', checked)}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 mt-3">
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input
                          type="time"
                          value={workingHours[day.key]?.start || ''}
                          disabled={!workingHours[day.key]?.isWorking}
                          onChange={(e) => updateWorkingHour(day.key, 'start', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input
                          type="time"
                          value={workingHours[day.key]?.end || ''}
                          disabled={!workingHours[day.key]?.isWorking}
                          onChange={(e) => updateWorkingHour(day.key, 'end', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Exceções de data</h4>
                </div>
                <Button type="button" variant="outline" size="sm" className="flex items-center gap-2" onClick={addException}>
                  <Plus className="w-4 h-4" />
                  Adicionar exceção
                </Button>
              </div>
              <div className="space-y-3">
                {exceptions.map((exception) => (
                  <div key={exception.id} className="rounded-lg border border-slate-200 p-3 space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">Data</Label>
                        <Input
                          type="date"
                          value={exception.date}
                          onChange={(e) => updateException(exception.id, 'date', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">Aberto</Label>
                        <Switch
                          checked={exception.isWorking}
                          onCheckedChange={(checked) => updateException(exception.id, 'isWorking', checked)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeException(exception.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input
                          type="time"
                          value={exception.start}
                          disabled={!exception.isWorking}
                          onChange={(e) => updateException(exception.id, 'start', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input
                          type="time"
                          value={exception.end}
                          disabled={!exception.isWorking}
                          onChange={(e) => updateException(exception.id, 'end', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {exceptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Adicione exceções para datas específicas com horários diferentes.</p>
                )}
              </div>
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
                {selectedProfessional ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover profissional</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedProfessional?.name}? Esta acao nao pode ser desfeita.
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
