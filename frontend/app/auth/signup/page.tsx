'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import Cookies from 'js-cookie'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/lib/api/auth'

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  salonName: z.string().min(2, 'Nome do salao deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas nao coincidem',
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      const response = await authApi.register({
        name: data.name,
        salonName: data.salonName,
        email: data.email,
        password: data.password,
      })

      if (!response.token) {
        throw new Error('Token de autenticação não recebido')
      }

      Cookies.set('beautyflow_token', response.token, {
        expires: 7,
        path: '/',
        sameSite: 'lax',
      })
      toast.success('Conta criada com sucesso! Seu trial de 3 horas comecou.')
      window.location.href = '/dashboard'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-foreground">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Criar conta
        </h2>
        <p className="text-muted-foreground">
          Comece seu trial gratuito de 3 horas
        </p>
      </div>

      {/* Trial badge */}
      <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <Clock className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium text-primary">
          3 horas gratis para testar todas as funcionalidades
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Seu nome</Label>
          <Input
            id="name"
            placeholder="Maria Silva"
            {...register('name')}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="salonName">Nome do salao</Label>
          <Input
            id="salonName"
            placeholder="Salao da Maria"
            {...register('salonName')}
            disabled={isLoading}
          />
          {errors.salonName && (
            <p className="text-sm text-destructive">{errors.salonName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="maria@exemplo.com"
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar conta e comecar trial
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ja tem uma conta?{' '}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Fazer login
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Ao criar uma conta, voce concorda com nossos{' '}
        <Link href="/terms" className="underline hover:text-foreground">
          Termos de Servico
        </Link>{' '}
        e{' '}
        <Link href="/privacy" className="underline hover:text-foreground">
          Politica de Privacidade
        </Link>
      </p>
    </div>
  )
}
