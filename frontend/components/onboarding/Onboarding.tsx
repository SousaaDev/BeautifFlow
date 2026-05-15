"use client"

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import { tenantApi } from '@/lib/api/tenants'
import { settingsApi } from '@/lib/api/settingsApi'
import {
  WEEKDAY_KEYS,
  WEEKDAY_LABELS_PT,
  type WeekdayKey,
  type DayScheduleUi,
  defaultWeeklySchedule,
  scheduleFromTenant,
  uiScheduleToBusinessHours,
  validateWeeklySchedule,
} from '@/lib/weeklyBusinessHours'
import { useToast } from '@/hooks/use-toast'

export default function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant, refreshUser } = useAuth()
  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [weeklySchedule, setWeeklySchedule] = useState<Record<WeekdayKey, DayScheduleUi>>(() => defaultWeeklySchedule())
  const [bufferMinutes, setBufferMinutes] = useState(10)
  const [notificationsEnabled, setNotificationsEnabled] = useState({
    newAppointments: true,
    cancellations: true,
    weeklyReports: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!tenant) return
    setWeeklySchedule(scheduleFromTenant(tenant.businessHours))
    setBufferMinutes(tenant.bufferMinutes ?? 10)
  }, [tenant])

  const saveStep = async () => {
    if (!tenant?.id) return
    setIsSaving(true)
    try {
      if (step === 0) {
        const scheduleError = validateWeeklySchedule(weeklySchedule)
        if (scheduleError) {
          toast({ title: 'Horários', description: scheduleError, variant: 'destructive' })
          setIsSaving(false)
          return
        }
        const businessHoursPayload = uiScheduleToBusinessHours(weeklySchedule)
        await tenantApi.update(tenant.id, { businessHours: businessHoursPayload, bufferMinutes })
      }

      if (step === 1) {
        // save notification preferences
        await settingsApi.updateNotificationSettings(notificationsEnabled)
      }

      // advance
      setStep((s) => s + 1)
    } catch (error) {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao salvar', variant: 'destructive' })
    } finally {
      setIsSaving(false)
      await refreshUser()
    }
  }

  const finish = () => {
    window.localStorage.setItem('onboardingCompleted', '1')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bem-vindo ao BeautyFlow — Configuração rápida</DialogTitle>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Vamos definir os horários de funcionamento do salão e o tempo de pausa entre atendimentos.</p>
            <div className="space-y-3">
              {WEEKDAY_KEYS.map((day) => {
                const row = weeklySchedule[day]
                return (
                  <div key={day} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium">{WEEKDAY_LABELS_PT[day]}</div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Abre</Label>
                      <Input
                        type="time"
                        value={row.open}
                        onChange={(e) => setWeeklySchedule((prev) => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                        className="w-24"
                      />
                      <Label className="text-xs">Fecha</Label>
                      <Input
                        type="time"
                        value={row.close}
                        onChange={(e) => setWeeklySchedule((prev) => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                        className="w-24"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <Separator />

            <div>
              <Label className="text-xs">Pausa entre atendimentos (min)</Label>
              <Input type="number" min={0} value={bufferMinutes} onChange={(e) => setBufferMinutes(Number(e.target.value || 0))} className="w-24" />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>Pular</Button>
              <Button onClick={saveStep} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar e continuar'}</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Ative as notificações que deseja receber.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Novos agendamentos</Label>
                </div>
                <Switch checked={notificationsEnabled.newAppointments} onCheckedChange={(v) => setNotificationsEnabled(prev => ({ ...prev, newAppointments: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Cancelamentos</Label>
                </div>
                <Switch checked={notificationsEnabled.cancellations} onCheckedChange={(v) => setNotificationsEnabled(prev => ({ ...prev, cancellations: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Relatórios semanais</Label>
                </div>
                <Switch checked={notificationsEnabled.weeklyReports} onCheckedChange={(v) => setNotificationsEnabled(prev => ({ ...prev, weeklyReports: v }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
              <Button onClick={saveStep} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar e continuar'}</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm">Tudo pronto — você já pode ajustar mais detalhes em Configurações.</p>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { window.location.href = '/dashboard/settings' }}>Ir para configurações</Button>
              <Button onClick={finish}>Concluir</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
