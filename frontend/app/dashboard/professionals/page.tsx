'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Users, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'

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

export default function ProfessionalsPage() {
  const { tenant } = useAuth()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setIsDialogOpen(true)
  }

  const openEditDialog = (professional: Professional) => {
    setSelectedProfessional(professional)
    reset({
      name: professional.name,
      isActive: professional.isActive,
    })
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
      if (selectedProfessional) {
        await professionalsApi.update(tenant.id, selectedProfessional.id, data)
        toast.success('Profissional atualizado com sucesso')
      } else {
        await professionalsApi.create(tenant.id, data)
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
