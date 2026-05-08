'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, Clock, Crown, AlertTriangle } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { useTrial } from '@/hooks/use-trial'
import { billingApi } from '@/lib/api/billing'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const plans = [
  {
    id: 'starter',
    name: 'BeautyFlow Completo',
    price: 49.9,
    oldPrice: 79.9,
    description: 'Todas as funcionalidades em um único plano: agenda online, estoque, vendas, relatórios e suporte prioritário.',
    features: [
      'Profissionais ilimitados',
      'Agendamentos ilimitados',
      'Página de agendamento online',
      'Gestão de clientes e estoque',
      'Relatórios e analytics avançados',
      'Suporte prioritário por e-mail',
    ],
    icon: Crown,
  },
]

export default function BillingPage() {
  const { tenant, refreshUser } = useAuth()
  const { isTrialing, formattedTime, isExpired } = useTrial()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleSelectPlan = async (planId: string) => {
    setLoadingPlan(planId)
    try {
      const response = await billingApi.createCheckout(
        planId,
        `${window.location.origin}/dashboard/billing/success`,
        `${window.location.origin}/dashboard/billing`
      )

      if (response.planUpdated) {
        toast.success(response.message || 'Plano alterado com sucesso')
        refreshUser?.()
        setLoadingPlan(null)
        return
      }

      if (!response.checkoutUrl) {
        throw new Error('Checkout não disponível')
      }

      window.location.href = response.checkoutUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao iniciar checkout'
      toast.error(message)
      setLoadingPlan(null)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const { url } = await billingApi.getPortalUrl()
      window.location.href = url
    } catch (error) {
      toast.error('Erro ao abrir portal de pagamento')
    }
  }

  const currentPlan = tenant?.currentPlan
  const isActive = tenant?.status === 'ACTIVE'
  const effectiveCurrentPlan = isTrialing && !isExpired ? 'starter' : currentPlan || 'starter'

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-slate-950 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:shadow-black/20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-r from-fuchsia-500/10 via-indigo-500/10 to-cyan-400/10 opacity-100 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="bg-amber-400 text-slate-950 dark:bg-amber-500 dark:text-slate-950">Oferta promocional</Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl dark:text-white">
                BeautyFlow Completo por R$ 49,90/mês
              </h1>
              <p className="max-w-2xl text-slate-600 sm:text-lg dark:text-slate-300">
                O plano único para salões que querem controle total: agenda online, clientes, estoque, vendas e relatórios avançados com desconto exclusivo.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-3xl bg-slate-100 px-4 py-3 text-slate-900 shadow-sm shadow-slate-900/10 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/10">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Preço antigo</p>
                <p className="text-2xl font-semibold line-through text-slate-500 dark:text-slate-500">R$ 79,90</p>
              </div>
              <div className="rounded-3xl bg-white px-4 py-3 text-slate-900 shadow-sm shadow-slate-900/10 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/10">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Sua oferta</p>
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">R$ 49,90</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Plano único</p>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">BeautyFlow Completo</h2>
              </div>
              <Badge className="bg-emerald-500 text-white">-38% OFF</Badge>
            </div>
            <div className="mt-8 space-y-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-900/5 dark:bg-slate-950 dark:shadow-black/10">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Assinatura mensal</p>
                <p className="text-5xl font-semibold text-slate-950 dark:text-white">R$ 49,90</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cobrado mensalmente</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {plans[0].features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className="mt-8 w-full dark:text-white"
              variant="default"
              onClick={() => handleSelectPlan(plans[0].id)}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === plans[0].id ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </span>
              ) : (
                'Assinar agora'
              )}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {isTrialing && (
            <Card className={cn(
              'overflow-hidden border-0 bg-gradient-to-r from-slate-950 to-slate-900 text-white shadow-xl shadow-slate-900/40',
              isExpired ? 'from-rose-950 to-rose-900' : 'from-emerald-950 to-emerald-900'
            )}>
              <CardContent className="space-y-4 py-8 px-7">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white/10 p-3">
                    {isExpired ? (
                      <AlertTriangle className="h-6 w-6 text-rose-400" />
                    ) : (
                      <Clock className="h-6 w-6 text-emerald-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Trial</p>
                    <h3 className="text-xl font-semibold">
                      {isExpired ? 'Trial expirado' : 'Aproveite o trial completo'}
                    </h3>
                  </div>
                </div>
                <p className="text-slate-300">
                  {isExpired
                    ? 'Seu período de trial terminou. Escolha o plano para continuar acessando todas as funcionalidades.'
                    : `Tempo restante: ${formattedTime}. Depois do trial, o plano BeautyFlow Completo será cobrado automaticamente.`}
                </p>
              </CardContent>
            </Card>
          )}

          {isActive && currentPlan && (
            <Card className="border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
              <CardContent className="space-y-4 py-8 px-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-[0.2em] dark:text-slate-400">Assinatura ativa</p>
                    <h3 className="text-2xl font-semibold dark:text-white">Seu plano está funcionando</h3>
                  </div>
                  <Badge className="bg-emerald-500 text-white">Ativo</Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Você está no plano <span className="font-semibold">BeautyFlow Completo</span>. Acesse o portal para gerenciar pagamentos, faturas e métodos de pagamento.
                </p>
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  className="w-full md:w-auto dark:border-slate-500 dark:text-white dark:hover:bg-slate-700"
                >
                  Gerenciar assinatura
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <CardHeader className="pb-4">
              <CardTitle className="dark:text-white">Por que escolher BeautyFlow?</CardTitle>
              <CardDescription className="dark:text-slate-400">Uma plataforma completa feita para melhorar a rotina do seu salão e acelerar vendas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {plans[0].features.map((feature, index) => (
                <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {feature}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="dark:text-white">Detalhes do desconto</CardTitle>
              <CardDescription className="dark:text-slate-400">Oferta por tempo limitado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Valor original</p>
                <p className="text-xl font-semibold line-through text-slate-600 dark:text-slate-500">R$ 79,90</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Valor com desconto</p>
                <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">R$ 49,90</p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Aproveite o preço reduzido imediatamente ao assinar. Sem taxas escondidas e com acesso a todos os recursos do BeautyFlow Completo.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="dark:text-white">Perguntas rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <p className="font-semibold dark:text-white">Pode cancelar a qualquer momento?</p>
                <p>Sim, o acesso permanece até o fim do período já pago.</p>
              </div>
              <div>
                <p className="font-semibold dark:text-white">Trial com acesso completo?</p>
                <p>Sim, o trial oferece todas as funcionalidades do plano completo.</p>
              </div>
              <div>
                <p className="font-semibold dark:text-white">Formas de pagamento?</p>
                <p>Cartões, boleto e PIX.</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
