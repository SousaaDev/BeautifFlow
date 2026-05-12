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

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

type PublicCustomer = {
  id: string
  name: string
  email: string
  phone?: string | null
  token: string
}

export default function PublicCustomerLoginPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await publicApi.loginCustomer({
        slug,
        email: data.email,
        password: data.password,
      })

      const customer: PublicCustomer = {
        id: response.customer.id,
        name: response.customer.name,
        email: response.customer.email,
        phone: response.customer.phone,
        token: response.token,
      }

      window.localStorage.setItem('beautyflow_public_customer', JSON.stringify(customer))
      toast.success('Login realizado com sucesso')
      router.push(`/agendar/${slug}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao entrar na conta'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-foreground max-w-md mx-auto">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Login do cliente</h2>
        <p className="text-muted-foreground">
          Entre com seu email para continuar o agendamento.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} disabled={isLoading} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...register('password')} disabled={isLoading} />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar e continuar
        </Button>
      </form>

      <div className="text-sm text-center text-muted-foreground">
        Ainda não tem conta?{' '}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => router.push(`/agendar/${slug}/register`)}
        >
          Criar conta de cliente
        </button>
      </div>
    </div>
  )
}
