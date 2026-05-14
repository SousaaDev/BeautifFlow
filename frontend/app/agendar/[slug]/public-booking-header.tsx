'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { LogIn, UserPlus, LogOut, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { publicCustomerChangedEvent } from '@/lib/bookingDraft'

type PublicCustomer = {
  id: string
  name: string
  email: string
  phone?: string | null
  token: string
}

const STORAGE_KEY = 'beautyflow_public_customer'

function readCustomer(): PublicCustomer | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicCustomer
  } catch {
    return null
  }
}

function PublicBookingHeaderInner() {
  const params = useParams()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const [customer, setCustomer] = useState<PublicCustomer | null>(null)

  const refresh = useCallback(() => {
    setCustomer(readCustomer())
  }, [])

  useEffect(() => {
    refresh()
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) refresh()
    }
    const onCustom = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener(publicCustomerChangedEvent, onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(publicCustomerChangedEvent, onCustom as EventListener)
    }
  }, [refresh])

  const onLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(publicCustomerChangedEvent))
    setCustomer(null)
  }

  const isAuthRoute = pathname?.includes('/login') || pathname?.includes('/register')
  const qs = searchParams.toString()
  const authSuffix =
    qs.length > 0 ? `?${qs}` : isAuthRoute ? '' : '?next=confirm'

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
      {customer ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground max-w-[200px] md:max-w-[280px]">
            <User className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate font-medium text-foreground" title={customer.email}>
              {customer.name}
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      ) : (
        <>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/agendar/${slug}/login${authSuffix}`}>
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link href={`/agendar/${slug}/register${authSuffix}`}>
              <UserPlus className="h-4 w-4" />
              Criar conta
            </Link>
          </Button>
        </>
      )}
    </div>
  )
}

export function PublicBookingHeader() {
  return (
    <Suspense fallback={<div className="h-9 w-32 shrink-0 rounded-md bg-muted animate-pulse" aria-hidden />}>
      <PublicBookingHeaderInner />
    </Suspense>
  )
}
