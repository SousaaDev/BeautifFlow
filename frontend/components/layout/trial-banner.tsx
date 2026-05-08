'use client'

import Link from 'next/link'
import { Clock, Zap } from 'lucide-react'
import { useTrial } from '@/hooks/use-trial'
import { Button } from '@/components/ui/button'

export function TrialBanner() {
  const { isTrialing, formattedTime, isExpired } = useTrial()

  if (!isTrialing) return null

  if (isExpired) {
    return (
      <div className="bg-destructive text-white px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              Seu trial expirou! Escolha um plano para continuar usando o BeautyFlow.
            </span>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/billing">Ver planos</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5" />
          <span className="text-sm">
            Trial gratuito: <span className="font-mono font-bold">{formattedTime}</span> restantes
          </span>
        </div>
        <Button asChild size="sm" variant="secondary" className="gap-2">
          <Link href="/dashboard/billing">
            <Zap className="w-4 h-4" />
            Fazer upgrade
          </Link>
        </Button>
      </div>
    </div>
  )
}
