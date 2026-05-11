'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CreditCard, Settings as SettingsIcon, User, Building, Bell, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { useTrial } from '@/hooks/use-trial'
import { useToast } from '@/hooks/use-toast'
import { authApi } from '@/lib/api/auth'
import { tenantApi } from '@/lib/api/tenants'
import { settingsApi, NotificationSettings } from '@/lib/api/settingsApi'

export default function SettingsPage() {
  const { tenant, user, refreshUser } = useAuth()
  const { isTrialing, isExpired, formattedTime } = useTrial()
  const { toast } = useToast()

  const [userName, setUserName] = useState(user?.name || '')
  const [userEmail, setUserEmail] = useState(user?.email || '')
  const [companyName, setCompanyName] = useState(tenant?.name || '')
  const [companySlug, setCompanySlug] = useState(tenant?.slug || '')
  const [isLoading, setIsLoading] = useState(false)

  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState<NotificationSettings>({
    newAppointments: true,
    cancellations: true,
    weeklyReports: false,
  })

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Load notification settings on mount
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const settings = await settingsApi.getNotificationSettings()
        setNotificationsEnabled(settings)
      } catch (error) {
        console.error('Failed to load notification settings:', error)
        // Keep default values if loading fails
      }
    }

    loadNotificationSettings()
  }, [])

  const hasActiveSubscription = tenant?.status === 'ACTIVE'
  const hasTrial = isTrialing && !isExpired

  const billingDescription = hasActiveSubscription
    ? 'Sua assinatura BeautyFlow Completo está ativa. Acesse o faturamento para gerenciar ou cancelar.'
    : hasTrial
    ? `Seu trial está ativo por mais ${formattedTime}. Depois do período você poderá assinar aqui.`
    : isExpired
    ? 'O trial terminou. Assine agora para continuar usando todas as funcionalidades.'
    : 'Assine o BeautyFlow Completo e tenha agenda, estoque, vendas e relatórios em um único plano.'

  const billingButtonLabel = hasActiveSubscription
    ? 'Gerenciar / cancelar assinatura'
    : 'Ir para faturamento'

  const handleSaveProfile = async () => {
    if (!user?.id || !tenant?.id) {
      toast({
        title: 'Erro',
        description: 'Dados de usuário ou tenant não disponíveis',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      // Update user profile
      if (userName !== user.name || userEmail !== user.email) {
        await authApi.updateProfile({
          name: userName,
          email: userEmail,
        })
      }

      // Update tenant
      if (companyName !== tenant.name || companySlug !== tenant.slug) {
        await tenantApi.update(tenant.id, {
          name: companyName,
          slug: companySlug,
        })
      }

      // Save notification preferences
      await settingsApi.updateNotificationSettings(notificationsEnabled)

      // Refresh user data
      await refreshUser()

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao atualizar perfil',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As novas senhas não correspondem',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      })

      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso',
      })

      setShowPasswordDialog(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao alterar senha',
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">Centralize tudo em um só lugar: faturamento, conta e preferências.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Faturamento</CardTitle>
              <CardDescription>{billingDescription}</CardDescription>
            </div>
            <Badge className="bg-primary text-primary-foreground">
              {hasActiveSubscription ? 'Ativo' : hasTrial ? 'Trial' : isExpired ? 'Expirado' : 'Novo'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Centralize sua assinatura do BeautyFlow Completo e acesse o portal de cobrança sempre que precisar.
            </p>
            <Button asChild>
              <Link href="/dashboard/billing">{billingButtonLabel}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Conta</CardTitle>
              <CardDescription>Gerencie dados da empresa e configurações.</CardDescription>
            </div>
            <SettingsIcon className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Dados do Usuário</h4>
              </div>
              <div className="grid gap-3 pl-6">
                <div className="grid gap-2">
                  <Label htmlFor="user-name" className="text-xs text-muted-foreground">Nome</Label>
                  <Input 
                    id="user-name" 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)}
                    className="text-sm" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-email" className="text-xs text-muted-foreground">Email</Label>
                  <Input 
                    id="user-email" 
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="text-sm" 
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Dados da Empresa</h4>
              </div>
              <div className="grid gap-3 pl-6">
                <div className="grid gap-2">
                  <Label htmlFor="company-name" className="text-xs text-muted-foreground">Nome do Salão</Label>
                  <Input 
                    id="company-name" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="text-sm" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company-slug" className="text-xs text-muted-foreground">Slug</Label>
                  <Input 
                    id="company-slug" 
                    value={companySlug}
                    onChange={(e) => setCompanySlug(e.target.value)}
                    className="text-sm" 
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Notificações</h4>
              </div>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Novos agendamentos</Label>
                    <p className="text-xs text-muted-foreground">Receba notificações quando clientes agendarem</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled.newAppointments}
                    onCheckedChange={(checked) =>
                      setNotificationsEnabled(prev => ({ ...prev, newAppointments: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Cancelamentos</Label>
                    <p className="text-xs text-muted-foreground">Avisos sobre cancelamentos de agendamento</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled.cancellations}
                    onCheckedChange={(checked) =>
                      setNotificationsEnabled(prev => ({ ...prev, cancellations: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Relatórios semanais</Label>
                    <p className="text-xs text-muted-foreground">Resumo semanal das vendas e agendamentos</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled.weeklyReports}
                    onCheckedChange={(checked) =>
                      setNotificationsEnabled(prev => ({ ...prev, weeklyReports: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Segurança</h4>
              </div>
              <div className="space-y-3 pl-6">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  Alterar senha
                </Button>
              </div>
            </div>

            <Separator />

            <Button 
              onClick={handleSaveProfile} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e a nova senha para alterá-la.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              disabled={isChangingPassword}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
