'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { UserCircle, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { useAuth } from '@/contexts/auth-context'
import { customersApi } from '@/lib/api/customers'
import type { Customer } from '@/lib/types'
import { formatBirthdayDisplay } from '@/lib/formatBirthday'

import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const customerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : ''))
    .refine((s) => !s || z.string().email().safeParse(s).success, {
      message: 'Email invalido',
    }),
  phone: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.replace(/\D/g, '').length >= 8, {
      message: 'Telefone deve ter pelo menos 8 digitos',
    }),
  birthDate: z
    .string()
    .optional()
    .refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s), 'Data invalida'),
})

type CustomerFormData = z.infer<typeof customerSchema>

export default function CustomersPage() {
  const { tenant } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  })

  useEffect(() => {
    if (tenant?.id) {
      loadCustomers()
    }
  }, [tenant?.id])

  const loadCustomers = async () => {
    if (!tenant?.id) return
    try {
      const data = await customersApi.list(tenant.id)
      setCustomers(data)
    } catch (error) {
      toast.error('Erro ao carregar clientes')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setSelectedCustomer(null)
    reset({ name: '', email: '', phone: '', birthDate: '' })
    setIsDialogOpen(true)
  }

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    reset({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      birthDate: customer.birthDate ?? '',
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  const onSubmit = async (data: CustomerFormData) => {
    if (!tenant?.id) return
    setIsSubmitting(true)

    try {
      const payload: {
        name: string
        email?: string
        phone: string
        birthDate?: string | null
      } = {
        name: data.name,
        phone: data.phone.trim(),
        ...(data.email?.trim() ? { email: data.email.trim() } : {}),
      }
      if (data.birthDate?.trim()) {
        payload.birthDate = data.birthDate.trim()
      } else if (selectedCustomer) {
        payload.birthDate = null
      }

      if (selectedCustomer) {
        await customersApi.update(selectedCustomer.id, payload)
        toast.success('Cliente atualizado com sucesso')
      } else {
        await customersApi.create(tenant.id, payload)
        toast.success('Cliente criado com sucesso')
      }
      setIsDialogOpen(false)
      loadCustomers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar cliente'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCustomer) return
    setIsSubmitting(true)

    try {
      await customersApi.delete(selectedCustomer.id)
      toast.success('Cliente removido com sucesso')
      setIsDeleteDialogOpen(false)
      loadCustomers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover cliente'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-sm font-medium text-accent">
              {c.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (c: Customer) => c.phone || '-',
    },
    {
      key: 'birthDate',
      header: 'Aniversario',
      render: (c: Customer) => formatBirthdayDisplay(c.birthDate),
    },
    {
      key: 'createdAt',
      header: 'Cliente desde',
      render: (c: Customer) => format(new Date(c.createdAt), 'dd/MM/yyyy'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (c: Customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(c)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDeleteDialog(c)}
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
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie os clientes do seu salao
        </p>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar clientes..."
        onAdd={openCreateDialog}
        addLabel="Novo cliente"
        emptyMessage="Nenhum cliente cadastrado"
        emptyIcon={<UserCircle className="w-12 h-12 mx-auto text-muted-foreground/50" />}
        getRowKey={(c) => c.id}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? 'Editar cliente' : 'Novo cliente'}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer
                ? 'Atualize os dados do cliente'
                : 'Adicione um novo cliente ao seu salao'}
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

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="off" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input id="phone" type="tel" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de nascimento (opcional)</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
              <p className="text-xs text-muted-foreground">
                Na lista aparece como aniversario (dia e mes).
              </p>
              {errors.birthDate && (
                <p className="text-sm text-destructive">{errors.birthDate.message}</p>
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
                {selectedCustomer ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedCustomer?.name}? Esta acao nao pode ser desfeita.
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
