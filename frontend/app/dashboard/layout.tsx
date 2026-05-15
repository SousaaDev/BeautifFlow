'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { TrialBanner } from '@/components/layout/trial-banner'
import { Skeleton } from '@/components/ui/skeleton'
import Onboarding from '@/components/onboarding/Onboarding'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [openOnboarding, setOpenOnboarding] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const forced = searchParams?.get('onboarding') === 'true'
    const completed = window.localStorage.getItem('onboardingCompleted') === '1'
    if (forced || !completed) {
      setOpenOnboarding(true)
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background dark:bg-slate-920">
      <TrialBanner />
      <Sidebar />
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0">
          {children}
          <Onboarding open={openOnboarding} onClose={() => setOpenOnboarding(false)} />
        </div>
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  )
}
