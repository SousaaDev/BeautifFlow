'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { billingApi } from '@/lib/api/billing'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUser, tenant } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId =
        searchParams.get('session_id') || searchParams.get('sessionId')
      
      if (!sessionId) {
        setStatus('error')
        return
      }

      try {
        const result = await billingApi.verifyPayment(sessionId)
        if (result.success) {
          setPlan(result.plan)
          setStatus('success')
          await refreshUser()
          return
        }

        // Se a verificação Stripe falhar, tente atualizar o status local do tenant
        await refreshUser()
        setStatus('error')
      } catch (error) {
        await refreshUser()
        setStatus('error')
      }
    }

    verifyPayment()
  }, [searchParams, refreshUser])

  useEffect(() => {
    if (status === 'error' && tenant?.status === 'ACTIVE') {
      setPlan('BeautyFlow Completo')
      setStatus('success')
    }
  }, [status, tenant])

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Verificando pagamento...</h2>
            <p className="text-muted-foreground">
              Aguarde enquanto confirmamos seu pagamento
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <XCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Erro na verificacao</h2>
            <p className="text-muted-foreground mb-6">
              Nao foi possivel confirmar seu pagamento. Se voce ja foi cobrado, entre em contato com o suporte.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/dashboard/billing">Tentar novamente</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Voltar ao dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento confirmado!</CardTitle>
          <CardDescription>
            Sua assinatura do plano {plan?.charAt(0).toUpperCase()}{plan?.slice(1)} foi ativada com sucesso.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground mb-1">Proximo passo</p>
            <p className="font-medium">
              Comece a usar todas as funcionalidades do BeautyFlow!
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/dashboard">Ir para o dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/appointments">Ver agendamentos</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
