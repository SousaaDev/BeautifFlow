'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, RefreshCw, LogOut, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { whatsappApi, WhatsAppStatusResponse } from '@/lib/api/whatsapp'

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await whatsappApi.getStatus()
      setStatus(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar status do WhatsApp')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar a conta atual e gerar um novo QR Code para reconectar?')) return
    setIsLoading(true)
    setError(null)
    try {
      // Disconnect fully (remove session) and immediately start a new session to generate QR
      await whatsappApi.disconnect()
      await whatsappApi.start()
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar/iniciar o WhatsApp')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStart = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await whatsappApi.start()
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar a sessão do WhatsApp')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const intervalId = window.setInterval(loadStatus, 3000)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700">
            <MessageSquare className="w-4 h-4" />
            WhatsApp Bot
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Conectar WhatsApp</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Escaneie o QR Code com o WhatsApp Web. A conta conectada será usada como bot de atendimento.
          </p>
        </div>
        <Button onClick={loadStatus} disabled={isLoading} variant="secondary">
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar status
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status de conexão</CardTitle>
            <CardDescription>{status?.status ?? 'Carregando...'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">{status?.message ?? 'Verificando conexão...'} </p>
            </div>

            {status?.status === 'connected' ? (
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-foreground">
                <p className="font-medium">Conectado</p>
                <p>O WhatsApp está pronto para receber mensagens de clientes.</p>
                <div className="mt-3">
                  <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
                    <LogOut className="mr-2 h-4 w-4" /> Desconectar e gerar QR
                  </Button>
                </div>
              </div>
            ) : null}

            {status?.status === 'disconnected' || status?.status === 'error' ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-900">
                <p className="font-medium">Reconectar</p>
                <p>Abra o WhatsApp Web pelo celular e escaneie o QR Code novamente.</p>
                <div className="mt-3">
                  <Button onClick={handleStart} disabled={isLoading}>
                    <Play className="mr-2 h-4 w-4" /> Iniciar sessão
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code de conexão</CardTitle>
            <CardDescription>Escaneie com o WhatsApp Web para iniciar o bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.qrUrl ? (
              <img
                src={status.qrUrl}
                alt="QR Code do WhatsApp"
                className="mx-auto max-h-[320px] rounded-2xl border border-muted/40 p-3"
              />
            ) : (
              <div className="rounded-xl border border-dashed border-muted/50 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                {status?.status === 'connected'
                  ? 'WhatsApp já está conectado. Nenhum QR Code necessário.'
                  : 'Aguardando QR Code... Atualize a página se necessário.'}
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Após a conexão, o bot poderá responder mensagens de clientes automaticamente.</p>
              <p>Use o WhatsApp Web para escanear o QR Code e manter a sessão ativa.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
