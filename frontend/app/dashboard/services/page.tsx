'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Scissors, MoreHorizontal, Pencil, Trash2, Loader2, Clock } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { servicesApi } from '@/lib/api/services'
import type { Service } from '@/lib/types'

import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const serviceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preco deve ser maior ou igual a zero'),
  duration: z.coerce.number().min(5, 'Duracao minima de 5 minutos'),
})

type ServiceFormData = z.infer<typeof serviceSchema>

export default function ServicesPage() {
  const { tenant } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { duration: 30 },
  })

  useEffect(() => {
    if (tenant?.id) {
      loadServices()
    }
  }, [tenant?.id])

  const loadServices = async () => {
    if (!tenant?.id) return
    try {
      const data = await servicesApi.list(tenant.id)
      setServices(data)
    } catch (error) {
      toast.error('Erro ao carregar servicos')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setSelectedService(null)
    reset({ name: '', description: '', price: 0, duration: 30 })
    setIsDialogOpen(true)
  }

  const openEditDialog = (service: Service) => {
    setSelectedService(service)
    reset({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration: service.duration,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service)
    setIsDeleteDialogOpen(true)
  }

  const onSubmit = async (data: ServiceFormData) => {
    if (!tenant?.id) return
    setIsSubmitting(true)

    try {
      if (selectedService) {
        await servicesApi.update(tenant.id, selectedService.id, data)
        toast.success('Servico atualizado com sucesso')
      } else {
        await servicesApi.create(tenant.id, data)
        toast.success('Servico criado com sucesso')
      }
      setIsDialogOpen(false)
      loadServices()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar servico'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tenant?.id || !selectedService) return
    setIsSubmitting(true)

    try {
      await servicesApi.delete(tenant.id, selectedService.id)
      toast.success('Servico removido com sucesso')
      setIsDeleteDialogOpen(false)
      loadServices()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover servico'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  }

  const columns = [
    {
      key: 'name',
      header: 'Servico',
      render: (s: Service) => (
        <div>
          <p className="font-medium">{s.name}</p>
          {s.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{s.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duracao',
      render: (s: Service) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          {formatDuration(s.duration)}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Preco',
      render: (s: Service) => (
        <span className="font-medium">R$ {s.price.toFixed(2)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (s: Service) => (
        <Badge variant={s.isActive ? 'default' : 'secondary'}>
          {s.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (s: Service) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(s)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDeleteDialog(s)}
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
        <h1 className="text-2xl font-bold text-foreground">Servicos</h1>
        <p className="text-muted-foreground">
          Gerencie os servicos oferecidos pelo seu salao
        </p>
      </div>

      <DataTable
        data={services}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar servicos..."
        onAdd={openCreateDialog}
        addLabel="Novo servico"
        emptyMessage="Nenhum servico cadastrado"
        emptyIcon={<Scissors className="w-12 h-12 mx-auto text-muted-foreground/50" />}
        getRowKey={(s) => s.id}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedService ? 'Editar servico' : 'Novo servico'}
            </DialogTitle>
            <DialogDescription>
              {selectedService
                ? 'Atualize os dados do servico'
                : 'Adicione um novo servico ao seu salao'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" placeholder="Ex: Corte de cabelo" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                placeholder="Descricao do servico..."
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preco (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price')}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duracao (min) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  step="5"
                  {...register('duration')}
                />
                {errors.duration && (
                  <p className="text-sm text-destructive">{errors.duration.message}</p>
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
                {selectedService ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover servico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedService?.name}? Esta acao nao pode ser desfeita.
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
