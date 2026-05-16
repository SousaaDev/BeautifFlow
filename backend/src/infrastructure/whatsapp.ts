import path from 'path'
import { mkdirSync } from 'fs'
import { Client, LocalAuth, Message } from 'whatsapp-web.js'
import qrcode from 'qrcode'

export type WhatsAppSessionStatus =
  | 'starting'
  | 'qr'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface WhatsAppSessionState {
  status: WhatsAppSessionStatus
  message: string
  qrUrl?: string
  ready?: boolean
}

interface WhatsAppSessionRecord {
  client: Client
  state: WhatsAppSessionState
}

export class WhatsAppService {
  private sessions = new Map<string, WhatsAppSessionRecord>()

  async getStatus(tenantId: string): Promise<WhatsAppSessionState> {
    const record = await this.ensureClient(tenantId)
    return record.state
  }

  async getQr(tenantId: string): Promise<WhatsAppSessionState> {
    const record = await this.ensureClient(tenantId)
    return record.state
  }

  async sendMessage(tenantId: string, phoneNumber: string, text: string): Promise<void> {
    const record = await this.ensureClient(tenantId)
    if (record.state.status !== 'connected' || !record.state.ready) {
      throw new Error('WhatsApp não está conectado. Por favor, escaneie o QR Code novamente.')
    }

    const chatId = this.normalizePhoneNumber(phoneNumber)
    await record.client.sendMessage(chatId, text)
  }

  private async ensureClient(tenantId: string): Promise<WhatsAppSessionRecord> {
    if (this.sessions.has(tenantId)) {
      return this.sessions.get(tenantId)!;
    }

    const sessionDirectory = path.join(process.cwd(), 'whatsapp-sessions', tenantId)
    mkdirSync(sessionDirectory, { recursive: true })

    const state: WhatsAppSessionState = {
      status: 'starting',
      message: 'Iniciando o cliente WhatsApp. Aguarde alguns segundos.',
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: tenantId, dataPath: sessionDirectory }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    })

    const record: WhatsAppSessionRecord = { client, state }
    this.sessions.set(tenantId, record)

    client.on('qr', async (qr: string) => {
      const qrUrl = await qrcode.toDataURL(qr)
      record.state = {
        status: 'qr',
        qrUrl,
        message: 'Escaneie esse QR Code com o WhatsApp Web para conectar a conta.',
      }
    })

    client.on('ready', () => {
      record.state = {
        status: 'connected',
        ready: true,
        message: 'WhatsApp conectado com sucesso. O bot está pronto para receber e responder mensagens.',
      }
    })

    client.on('authenticated', () => {
      record.state = {
        status: 'connected',
        ready: true,
        message: 'Autenticação concluída. O WhatsApp já está conectado.',
      }
    })

    client.on('auth_failure', (error: any) => {
      record.state = {
        status: 'error',
        message: `Falha de autenticação: ${error}`,
      }
    })

    client.on('disconnected', (reason: string) => {
      record.state = {
        status: 'disconnected',
        message: `Conexão perdida: ${reason}. Atualize a página e escaneie o QR Code novamente.`,
      }
      record.client.destroy().catch(() => null)
      this.sessions.delete(tenantId)
    })

    client.on('message', async (message: Message) => {
      try {
        if (message.fromMe) {
          return
        }

        const body = message.body?.trim() || ''
        const lowerBody = body.toLowerCase()

        if (lowerBody.includes('ping') || lowerBody === '!ping') {
          await message.reply('pong 🟢')
          return
        }

        if (lowerBody.includes('agendar') || lowerBody.includes('agenda')) {
          await message.reply(
            '📅 Para agendar, envie uma mensagem com: Nome | Serviço | Data | Hora. Exemplo:\nJoana | Corte | 25/05/2026 | 14:00'
          )
          return
        }

        if (lowerBody.includes('horário') || lowerBody.includes('horario') || lowerBody.includes('disponível')) {
          await message.reply(
            '🕒 Nossos horários estão abertos. Por favor me diga qual serviço você deseja e em qual dia para que eu te ajude.'
          )
          return
        }

        if (lowerBody.includes('ajuda') || lowerBody.includes('olá') || lowerBody.includes('oi')) {
          await message.reply(
            'Olá! Eu sou o assistente do salão. Posso ajudar com agendamentos, consultas de horários e informações de serviços.'
          )
          return
        }

        await message.reply(
          'Recebi sua mensagem! Em breve a equipe do salão BeautyFlow responderá. Para agendar, escreva: Nome | Serviço | Data | Hora.'
        )
      } catch (error) {
        console.error('Erro ao responder mensagem do WhatsApp:', error)
      }
    })

    client.initialize().catch((error) => {
      record.state = {
        status: 'error',
        message: `Erro ao inicializar o cliente WhatsApp: ${error}`,
      }
    })

    return record
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '')
    if (!cleaned) {
      throw new Error('Número de telefone inválido')
    }
    return `${cleaned}@c.us`
  }
}

export const whatsappService = new WhatsAppService()
