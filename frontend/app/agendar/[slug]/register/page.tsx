'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { publicApi } from '@/lib/api/public'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email invalido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas nao coincidem',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

type PublicCustomer = {
  id: string
  name: string
  email: string
  phone?: string | null
  token: string
}

export default function PublicCustomerRegisterPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const response = await publicApi.registerCustomer({
        slug,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
      })

      const customer: PublicCustomer = {
        id: response.customer.id,
        name: response.customer.name,
        email: response.customer.email,
        phone: response.customer.phone,
        token: response.token,
      }

      window.localStorage.setItem('beautyflow_public_customer', JSON.stringify(customer))
      toast.success('Conta criada com sucesso')
      router.push(`/agendar/${slug}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-foreground max-w-md mx-auto">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Criar conta de cliente</h2>
        <p className="text-muted-foreground">
          Crie sua conta para fazer agendamentos de forma mais rápida.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" {...register('name')} disabled={isLoading} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} disabled={isLoading} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" {...register('phone')} disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...register('password')} disabled={isLoading} />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input id="confirmPassword" type="password" {...register('confirmPassword')} disabled={isLoading} />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar conta e continuar
        </Button>
      </form>

      <div className="text-sm text-center text-muted-foreground">
        Ja tem conta?{' '}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => router.push(`/agendar/${slug}/login`)}
        >
          Fazer login
        </button>
      </div>
    </div>
  )
}
