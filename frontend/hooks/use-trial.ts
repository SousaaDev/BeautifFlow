'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface TrialState {
  isTrialing: boolean
  isExpired: boolean
  timeRemaining: number // in seconds
  formattedTime: string
  hoursRemaining: number
  minutesRemaining: number
  secondsRemaining: number
}

export function useTrial(): TrialState {
  const { tenant } = useAuth()
  const [timeRemaining, setTimeRemaining] = useState(0)

  const calculateTimeRemaining = useCallback(() => {
    if (!tenant?.trialEndsAt) return 0
    const endTime = new Date(tenant.trialEndsAt).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((endTime - now) / 1000))
  }, [tenant?.trialEndsAt])

  useEffect(() => {
    if (tenant?.status !== 'TRIALING' || !tenant.trialEndsAt) {
      setTimeRemaining(0)
      return
    }

    setTimeRemaining(calculateTimeRemaining())

    const redirectToBilling = () => {
      if (typeof window === 'undefined') return
      if (window.location.pathname !== '/dashboard/billing') {
        window.location.href = '/dashboard/billing'
      }
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        redirectToBilling()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [tenant?.status, tenant?.trialEndsAt, calculateTimeRemaining])

  const hours = Math.floor(timeRemaining / 3600)
  const minutes = Math.floor((timeRemaining % 3600) / 60)
  const seconds = timeRemaining % 60

  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return {
    isTrialing: tenant?.status === 'TRIALING',
    isExpired: tenant?.status === 'TRIALING' && timeRemaining <= 0,
    timeRemaining,
    formattedTime,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    secondsRemaining: seconds,
  }
}
