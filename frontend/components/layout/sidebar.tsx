'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Flower2,
  Sparkles,
  Package,
  Calendar,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Scissors,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useTrial } from '@/hooks/use-trial'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Profissionais', href: '/dashboard/professionals', icon: Users },
  { name: 'Clientes', href: '/dashboard/customers', icon: UserCircle },
  { name: 'Servicos', href: '/dashboard/services', icon: Sparkles },
  { name: 'Produtos', href: '/dashboard/products', icon: Package },
  { name: 'Agendamentos', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Vendas', href: '/dashboard/sales', icon: ShoppingCart },
]

const bottomNavigation = [
  { name: 'Configuracoes', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { tenant, logout } = useAuth()
  const { isTrialing, isExpired } = useTrial()
  const [mobileOpen, setMobileOpen] = useState(false)

  const hasActiveSubscription = tenant?.status === 'ACTIVE'
  const showPlansInSidebar = isTrialing && !isExpired && !hasActiveSubscription

  const navigationWithPlans = showPlansInSidebar
    ? [
        ...navigation,
        { name: 'Planos', href: '/dashboard/billing', icon: CreditCard },
      ]
    : navigation

  const NavContent = () => (
    <>
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-300">
            <Flower2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground">BeautyFlow</span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {tenant?.name || 'Carregando...'}
            </span>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navigationWithPlans.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <Separator className="my-4" />

        <nav className="space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-400">
            <Flower2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-foreground">BeautyFlow</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="fixed inset-y-0 left-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
        <NavContent />
      </div>
    </>
  )
}
