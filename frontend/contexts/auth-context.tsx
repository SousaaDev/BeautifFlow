'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import Cookies from 'js-cookie'
import { authApi } from '@/lib/api/auth'
import type { User, Tenant } from '@/lib/types'

interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const token = Cookies.get('beautyflow_token')
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }

      const userData = await authApi.me()
      setUser(userData)
    } catch {
      Cookies.remove('beautyflow_token')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback((token: string, userData: User) => {
    Cookies.set('beautyflow_token', token, { expires: 7 })
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    Cookies.remove('beautyflow_token')
    setUser(null)
    window.location.href = '/auth/login'
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant: user?.tenant || null,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
