import path from 'path'
import { mkdirSync, rmSync, existsSync } from 'fs'
import * as wppconnect from '@wppconnect-team/wppconnect'

import { pool } from '../database/connection'
import { redisClient } from './redis'
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl'
import { ServiceRepositoryImpl } from '../models/ServiceRepositoryImpl'
import { ProfessionalRepositoryImpl } from '../models/ProfessionalRepositoryImpl'
import { AppointmentRepositoryImpl } from '../models/AppointmentRepositoryImpl'
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl'
import { getWeekdayKeys, getNormalizedScheduleValue, parseWorkingHoursRange } from '../utils/businessHoursSchedule'
import type { Customer } from '../models/Customer'
import type { Service } from '../models/Service'
import type { Appointment } from '../models/Appointment'
import type { Professional } from '../models/Professional'

const customerRepository = new CustomerRepositoryImpl(pool)
const serviceRepository = new ServiceRepositoryImpl(pool)
const professionalRepository = new ProfessionalRepositoryImpl(pool)
const appointmentRepository = new AppointmentRepositoryImpl(pool)
const tenantRepository = new TenantRepositoryImpl(pool)

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
  client: wppconnect.Whatsapp | null
  state: WhatsAppSessionState
}

export class WhatsAppService {
  private sessions = new Map<string, WhatsAppSessionRecord>()
  private manuallyDisconnected = new Set<string>()
  private reconnectTimers = new Map<string, NodeJS.Timeout>()
  private reconnectDelayMs = 20000

  async getStatus(tenantId: string): Promise<WhatsAppSessionState> {
    const record = await this.ensureClient(tenantId)
    return { ...record.state }
  }

  async getQr(tenantId: string): Promise<WhatsAppSessionState> {
    const record = await this.ensureClient(tenantId)
    return { ...record.state }
  }

  async startSession(tenantId: string): Promise<WhatsAppSessionState> {
    // If user had manually disconnected, clear the flag and allow creating a new client
    if (this.manuallyDisconnected.has(tenantId)) {
      this.manuallyDisconnected.delete(tenantId)
    }

    const record = await this.ensureClient(tenantId)
    return { ...record.state }
  }

  async logout(tenantId: string): Promise<void> {
    const record = this.sessions.get(tenantId)

    if (record && record.client) {
      try {
        console.log(`[LOG - ${tenantId}] Encerrando sessão do WhatsApp...`)
        // Try a proper logout first, then close the client.
        try {
          if (typeof (record.client as any).logout === 'function') {
            await (record.client as any).logout()
            console.log(`[LOG - ${tenantId}] logout() chamado no cliente WhatsApp.`)
          }
        } catch (e) {
          console.log(`[LOG - ${tenantId}] logout() falhou (ignorado):`, String(e))
        }

        try {
          await record.client.close()
        } catch (e) {
          console.log(`[LOG - ${tenantId}] close() falhou (ignorado):`, String(e))
        }
      } catch (e) {
        console.log(`[LOG - ${tenantId}] Erro ao fechar cliente de forma padrão.`)
      }
      this.sessions.delete(tenantId)
    }

    const sessionDirectory = path.join(process.cwd(), 'whatsapp-sessions', tenantId)
    if (existsSync(sessionDirectory)) {
      rmSync(sessionDirectory, { recursive: true, force: true })
    }
  }

  async sendMessage(tenantId: string, phoneNumber: string, text: string): Promise<void> {
    const record = await this.ensureClient(tenantId)
    if (record.state.status !== 'connected' || !record.client || !record.state.ready) {
      throw new Error('WhatsApp não está conectado. Por favor, escaneie o QR Code novamente.')
    }

    const chatId = this.normalizePhoneNumber(phoneNumber)
    await record.client.sendText(chatId, text)
  }

  async disconnect(tenantId: string): Promise<void> {
    console.log(`[LOG - ${tenantId}] Desconectando WhatsApp (manualmente)...`)

    // mark as manually disconnected to avoid automatic reconnection
    this.manuallyDisconnected.add(tenantId)

    // ensure any running client is closed and session files removed
    const record = this.sessions.get(tenantId)
    if (record) {
      try {
        await this.cleanupSession(tenantId, record)
      } catch (_) {}
    }

    try {
      await this.logout(tenantId)
    } catch (_) {}

    // keep a lightweight record so getStatus can return disconnected immediately
    const state: WhatsAppSessionState = {
      status: 'disconnected',
      message: 'Desconectado manualmente. Clique em Iniciar para reconectar.',
    }
    this.sessions.set(tenantId, { client: null, state })

    console.log(`[LOG - ${tenantId}] WhatsApp desconectado (manual) com sucesso`)
  }

  private async ensureClient(tenantId: string): Promise<WhatsAppSessionRecord> {
    const existing = this.sessions.get(tenantId)

    // If the tenant manually disconnected, return a disconnected state and avoid creating a client
    if (this.manuallyDisconnected.has(tenantId)) {
      if (existing) return existing
      const state: WhatsAppSessionState = {
        status: 'disconnected',
        message: 'Desconectado manualmente. Clique em Iniciar para reconectar.',
      }
      const rec: WhatsAppSessionRecord = { client: null, state }
      this.sessions.set(tenantId, rec)
      return rec
    }

    if (existing && existing.client && existing.state.status !== 'disconnected' && existing.state.status !== 'error') {
      return existing
    }

    if (existing && (existing.state.status === 'starting' || existing.state.status === 'qr')) {
      return existing
    }

    if (existing) {
      await this.cleanupSession(tenantId, existing)
    }

    return this.createClient(tenantId)
  }

  private async cleanupSession(tenantId: string, record: WhatsAppSessionRecord): Promise<void> {
    if (record.client) {
      try {
        if (typeof (record.client as any).logout === 'function') {
          try {
            await (record.client as any).logout()
          } catch (_) {}
        }
        try {
          await record.client.close()
        } catch (_) {}
      } catch (_) {}
    }
    this.sessions.delete(tenantId)

    const timer = this.reconnectTimers.get(tenantId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(tenantId)
    }
  }

  private async createClient(tenantId: string): Promise<WhatsAppSessionRecord> {
    const sessionDirectory = path.join(process.cwd(), 'whatsapp-sessions', tenantId)
    mkdirSync(sessionDirectory, { recursive: true })

    const state: WhatsAppSessionState = {
      status: 'starting',
      message: 'Iniciando o cliente WhatsApp...',
    }

    console.log(`[LOG - ${tenantId}] Inicializando WPPConnect com o local-chrome...`)

    const record: WhatsAppSessionRecord = { client: null, state }
    this.sessions.set(tenantId, record)

    const scheduleReconnect = () => {
      this.scheduleReconnect(tenantId)
    }

    wppconnect.create({
      session: tenantId,
      catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
        console.log(`[LOG - ${tenantId}] QR Code gerado com sucesso!`)
        const qrUrl =
          typeof base64Qr === 'string' && base64Qr.startsWith('data:image/')
            ? base64Qr
            : `data:image/png;base64,${base64Qr}`
        record.state = {
          status: 'qr',
          qrUrl,
          message: 'Escaneie esse QR Code com o WhatsApp Web para conectar a conta.',
        }
      },
      statusFind: (statusSession: string | any) => {
        console.log(`[LOG - ${tenantId}] Status da sessão alterado para: ${statusSession}`)

        if (
          statusSession === 'isLogged' ||
          statusSession === 'chatsAvailable' ||
          statusSession === 'successChat' ||
          statusSession === 'qrReadSuccess' ||
          statusSession === 'inChat'
        ) {
          // clear qrUrl on successful connection
          record.state = {
            status: 'connected',
            ready: true,
            message: 'WhatsApp conectado com sucesso. O bot está pronto para operar.',
          }
          if (record.state.qrUrl) delete record.state.qrUrl
        }

        if (statusSession === 'notLogged') {
          // Entering QR state: preserve last generated qrUrl (if any)
          record.state = {
            ...record.state,
            status: 'qr',
            message: 'Aguardando leitura do QR Code...',
          }
        }

        if (
          statusSession === 'desconnectedMobile' ||
          statusSession === 'browserClose' ||
          statusSession === 'serverClose'
        ) {
          // Disconnected state: remove any QR stored
          record.state = {
            status: 'disconnected',
            message: 'Conexão perdida. Tentando reconectar automaticamente...',
          }
          scheduleReconnect()
        }
      },
      folderNameToken: 'whatsapp-sessions',
      headless: true,
      autoClose: 0,
      puppeteerOptions: {
        executablePath: path.join(
          process.cwd(),
          'local-chrome',
          'chrome',
          'win64-121.0.6167.85',
          'chrome-win64',
          'chrome.exe'
        ),
        args: [
          '--headless=shell',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-gpu',
          '--no-zygote',
        ],
      },
    })
      .then((client: wppconnect.Whatsapp) => {
        record.client = client

        record.state = {
          status: 'connected',
          ready: true,
          message: 'WhatsApp conectado com sucesso. O bot está pronto para operar.',
        }

        // ============================================================
        // OUVINTE DE MENSAGENS COM MÁQUINA DE ESTADOS (REDIS + POSTGRES)
        // ============================================================
        client.onMessage(async (message: any) => {
          if (message.fromMe) return

          const phone = message.from
          const text = message.body?.trim()
          if (!text) return

          const lowerText = text.toLowerCase()

          try {
            const sessionRaw = await redisClient.get(`session:${phone}`)
            let session = sessionRaw ? JSON.parse(sessionRaw) : null

            // ─── Fluxo de Entrada (sem sessão ativa) ─────────────────────────
            if (!session) {
              if (
                lowerText === 'oi' ||
                lowerText === 'olá' ||
                lowerText === 'ola' ||
                lowerText.includes('agendar') ||
                lowerText.includes('agenda')
              ) {
                console.log(`[WHATSAPP] Nova interação iniciada por ${phone}`)

                const rawPhone = this.normalizeRawPhone(phone)
                const customer = await this.findCustomerByPhone(tenantId, rawPhone)

                const services = await serviceRepository.findByTenant(tenantId)
                if (services.length === 0) {
                  await client.sendText(phone, 'Desculpe, não encontramos nenhum serviço cadastrado no momento. 😕')
                  return
                }

                if (!customer) {
                  let menu = `Olá! Vejo que é sua primeira vez. Escolha o serviço que deseja agendar:\n\n`
                  services.forEach((service, index) => {
                    menu += `*${index + 1}* - ${service.name} (R$ ${service.price})\n`
                  })
                  menu += '\n_Digite apenas o número da opção desejada._'

                  await redisClient.set(
                    `session:${phone}`,
                    JSON.stringify({ status: 'ESCOLHENDO_SERVICO', isNewCustomer: true }),
                    'EX',
                    1800
                  )
                  await client.sendText(phone, menu)
                  return
                }

                let menu = `Olá, *${customer.name}*! Que bom te ver de volta. 🙌\n\nQual serviço você deseja agendar hoje?\n\n`
                services.forEach((service, index) => {
                  menu += `*${index + 1}* - ${service.name} (R$ ${service.price})\n`
                })
                menu += '\n_Digite apenas o número da opção desejada._'

                await redisClient.set(
                  `session:${phone}`,
                  JSON.stringify({ status: 'ESCOLHENDO_SERVICO', customerId: customer.id }),
                  'EX',
                  1800
                )
                await client.sendText(phone, menu)
                return
              }
              return
            }

            // ─── Shortcut: voltar ─────────────────────────────────────────────
            if (lowerText === 'voltar' || lowerText === 'back') {
              const curr = session.status

              if (curr === 'ESCOLHENDO_HORARIO') {
                session.status = 'ESCOLHENDO_DATA'
                session.dataOffset = 0
                session.timeSlots = undefined
                await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)

                let menu = `Escolha o dia do agendamento:\n\n`
                for (let i = 0; i < 7; i++) {
                  const d = new Date()
                  d.setDate(d.getDate() + i)
                  const dayStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                  menu += `*${i + 1}* - ${dayStr}\n`
                }
                menu += `\n*8* - Ver mais dias\n\n_Digite o número do dia desejado._`
                await client.sendText(phone, menu)
                return
              }

              if (curr === 'ESCOLHENDO_BARBEIRO') {
                const services = await serviceRepository.findByTenant(tenantId)
                let menu = `Por favor, escolha o serviço desejado:\n\n`
                services.forEach((service, index) => {
                  menu += `*${index + 1}* - ${service.name} (R$ ${service.price})\n`
                })
                menu += '\n_Digite apenas o número da opção desejada._'

                session.status = 'ESCOLHENDO_SERVICO'
                session.serviceId = undefined
                session.professionalId = undefined
                session.timeSlots = undefined
                await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)
                await client.sendText(phone, menu)
                return
              }

              if (curr === 'AGUARDANDO_NOME_FINAL') {
                const draft = session.appointmentDraft
                if (!draft) {
                  await client.sendText(phone, 'Não encontramos o rascunho do agendamento. Envie "Oi" para reiniciar.')
                  await redisClient.del(`session:${phone}`)
                  return
                }

                const chosenDate = new Date(draft.startTime)
                const slots = await this.computeAvailableSlots(
                  tenantId,
                  draft.serviceId,
                  draft.professionalId,
                  chosenDate
                )
                if (!slots || slots.length === 0) {
                  await client.sendText(
                    phone,
                    'Desculpe, não há mais horários disponíveis para o rascunho. Reinicie a conversa com "Oi".'
                  )
                  await redisClient.del(`session:${phone}`)
                  return
                }

                let menu = `Estes são os horários disponíveis novamente:\n\n`
                slots.forEach((t, i) => (menu += `*${i + 1}* - ${t}\n`))
                menu += '\n_Digite o número do horário desejado._'

                session.status = 'ESCOLHENDO_HORARIO'
                session.timeSlots = slots
                session.chosenDate = chosenDate.toISOString()
                await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)
                await client.sendText(phone, menu)
                return
              }

              if (curr === 'ESCOLHENDO_SERVICO') {
                await redisClient.del(`session:${phone}`)
                await client.sendText(phone, 'Ok — conversa reiniciada. Envie "Oi" para começar novamente.')
                return
              }

              if (curr === 'ESCOLHENDO_DATA') {
                const professionals = await professionalRepository.findByTenant(tenantId)
                const availableIds = session.availableProfessionals ?? []
                const profsList = professionals.filter((p) => availableIds.includes(p.id))

                let menu = `Escolha outro profissional:\n\n`
                profsList.forEach((p, i) => (menu += `*${i + 1}* - ${p.name}\n`))
                menu += '\n_Digite o número do profissional._'

                session.status = 'ESCOLHENDO_BARBEIRO'
                session.dataOffset = undefined
                session.chosenDate = undefined
                session.timeSlots = undefined
                await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)
                await client.sendText(phone, menu)
                return
              }
            }

            // ─── ETAPA: Processar Nome do Pré-Cadastro ────────────────────────
            if (session.status === 'AGUARDANDO_NOME') {
              console.log(`[WHATSAPP] Cadastrando cliente novo: ${text} (${phone})`)

              const rawPhone = this.normalizeRawPhone(phone)
              const newCustomer = await customerRepository.create({
                tenantId,
                name: text,
                phone: rawPhone,
              })

              const services = await serviceRepository.findByTenant(tenantId)
              let menu = `Perfeito, *${newCustomer.name}*! Seu perfil foi criado com sucesso. 🎉\n\nAgora, escolha o serviço que você deseja agendar:\n\n`
              services.forEach((service, index) => {
                menu += `*${index + 1}* - ${service.name} (R$ ${service.price})\n`
              })
              menu += '\n_Digite o número da opção._'

              await redisClient.set(
                `session:${phone}`,
                JSON.stringify({ status: 'ESCOLHENDO_SERVICO', customerId: newCustomer.id }),
                'EX',
                1800
              )
              await client.sendText(phone, menu)
              return
            }

            // ─── ETAPA: Receber nome final e concluir agendamento ─────────────
            if (session.status === 'AGUARDANDO_NOME_FINAL') {
              console.log(`[WHATSAPP] Finalizando cadastro e agendamento para: ${text} (${phone})`)

              const rawPhone = this.normalizeRawPhone(phone)
              const newCustomer = await customerRepository.create({
                tenantId,
                name: text,
                phone: rawPhone,
              })

              const draft = session.appointmentDraft || null
              if (!draft) {
                await client.sendText(
                  phone,
                  '⚠️ Erro interno ao recuperar os dados do agendamento. Por favor, reinicie a conversa com "Oi".'
                )
                await redisClient.del(`session:${phone}`)
                return
              }

              const startTime = new Date(draft.startTime)
              const endTime = new Date(draft.endTime)

              const conflicts = await appointmentRepository.findConflicts(
                tenantId,
                draft.professionalId,
                startTime,
                endTime
              )
              if (conflicts && conflicts.length > 0) {
                await client.sendText(
                  phone,
                  '🚫 Desculpe, o horário acabou de ser reservado por outra pessoa. Reinicie a conversa para escolher outro horário.'
                )
                await redisClient.del(`session:${phone}`)
                return
              }

              await appointmentRepository.create({
                tenantId,
                customerId: newCustomer.id,
                professionalId: draft.professionalId,
                serviceId: draft.serviceId,
                startTime,
                endTime,
                status: 'scheduled',
              })

              await redisClient.del(`session:${phone}`)

              await client.sendText(
                phone,
                `🎉 *Agendamento Confirmado!*\n\nObrigado, *${newCustomer.name}*! Sua conta foi criada e o horário foi reservado com sucesso.`
              )
              return
            }

            // ─── ETAPA: Processar Escolha do Serviço ─────────────────────────
            if (session.status === 'ESCOLHENDO_SERVICO') {
              const services = await serviceRepository.findByTenant(tenantId)
              const choice = parseInt(text, 10) - 1

              if (isNaN(choice) || choice < 0 || choice >= services.length) {
                await client.sendText(
                  phone,
                  '⚠️ Opção inválida. Por favor, digite apenas o número correspondente ao serviço do menu.'
                )
                return
              }

              const selectedService = services[choice]
              const professionals = await professionalRepository.findByTenant(tenantId)
              const profsForService = professionals.filter((p) => (p.serviceIds ?? []).includes(selectedService.id))

              if (profsForService.length === 0) {
                await client.sendText(phone, 'Não temos profissionais disponíveis cadastrados no momento. 😟')
                return
              }

              let menu = `Você escolheu: *${selectedService.name}*.\n\nCom qual de nossos profissionais você gostaria de alinhar o atendimento?\n\n`
              profsForService.forEach((professional, index) => {
                menu += `*${index + 1}* - ${professional.name}\n`
              })
              menu += '\n_Digite o número do profissional._'

              session.status = 'ESCOLHENDO_BARBEIRO'
              session.serviceId = selectedService.id
              session.professionalId = undefined
              session.timeSlots = undefined
              session.availableProfessionals = profsForService.map((p) => p.id)
              await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)

              await client.sendText(phone, menu)
              return
            }

            // ─── ETAPA: Processar Escolha do Barbeiro ─────────────────────────
            if (session.status === 'ESCOLHENDO_BARBEIRO') {
              const availableIds = session.availableProfessionals ?? []
              const allProfessionals = await professionalRepository.findByTenant(tenantId)
              const profsList = allProfessionals.filter((p) => availableIds.includes(p.id))
              const choice = parseInt(text, 10) - 1

              if (isNaN(choice) || choice < 0 || choice >= profsList.length) {
                await client.sendText(phone, '⚠️ Opção inválida. Digite o número correspondente ao profissional.')
                return
              }

              const selectedProfessional = profsList[choice]

              const offers = await professionalRepository.professionalOffersService(
                tenantId,
                selectedProfessional.id,
                session.serviceId
              )
              if (!offers) {
                await client.sendText(
                  phone,
                  '⚠️ Este profissional não realiza o serviço selecionado. Por favor, escolha outro profissional.'
                )
                return
              }

              session.status = 'ESCOLHENDO_DATA'
              session.professionalId = selectedProfessional.id
              session.dataOffset = 0
              await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)

              let menu = `Escolha o dia do agendamento:\n\n`
              for (let i = 0; i < 7; i++) {
                const d = new Date()
                d.setDate(d.getDate() + i)
                const dayStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                menu += `*${i + 1}* - ${dayStr}\n`
              }
              menu += `\n*8* - Ver mais dias\n\n_Digite o número do dia desejado._`
              await client.sendText(phone, menu)
              return
            }

            // ─── ETAPA: Processar Escolha da DATA ────────────────────────────
            if (session.status === 'ESCOLHENDO_DATA') {
              const offset = session.dataOffset ?? 0
              const startDate = new Date()
              startDate.setHours(0, 0, 0, 0)
              startDate.setDate(startDate.getDate() + offset)

              const dates: Date[] = []
              for (let i = 0; i < 7; i++) {
                const d = new Date(startDate)
                d.setDate(d.getDate() + i)
                dates.push(d)
              }

              const choice = parseInt(text, 10)
              if (!isNaN(choice)) {
                if (choice === 8) {
                  session.dataOffset = offset + 7
                  await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)

                  const newOffset = offset + 7
                  const newStartDate = new Date()
                  newStartDate.setHours(0, 0, 0, 0)
                  newStartDate.setDate(newStartDate.getDate() + newOffset)

                  let menu = `Próximos dias disponíveis:\n\n`
                  for (let i = 0; i < 7; i++) {
                    const d = new Date(newStartDate)
                    d.setDate(d.getDate() + i)
                    const dayStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                    menu += `*${i + 1}* - ${dayStr}\n`
                  }
                  menu += `\n*8* - Ver mais dias\n\n_Digite o número do dia desejado._`
                  await client.sendText(phone, menu)
                  return
                } else if (choice >= 1 && choice <= 7) {
                  const selectedDate = dates[choice - 1]
                  const slots = await this.computeAvailableSlots(
                    tenantId,
                    session.serviceId,
                    session.professionalId,
                    selectedDate
                  )

                  if (!slots || slots.length === 0) {
                    await client.sendText(phone, 'Desculpe, não há horários disponíveis para esse dia. Escolha outro.')
                    return
                  }

                  let menu = `Horários disponíveis para ${selectedDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}:\n\n`
                  slots.forEach((t, i) => (menu += `*${i + 1}* - ${t}\n`))
                  menu += '\n_Digite o número do horário desejado._'

                  session.status = 'ESCOLHENDO_HORARIO'
                  session.timeSlots = slots
                  session.chosenDate = selectedDate.toISOString()
                  await redisClient.set(`session:${phone}`, JSON.stringify(session), 'EX', 1800)
                  await client.sendText(phone, menu)
                  return
                }
              }

              if (text.trim().toLowerCase() === 'data') {
                let menu = `Escolha o dia do agendamento:\n\n`
                dates.forEach((date, index) => {
                  const dayStr = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                  menu += `*${index + 1}* - ${dayStr}\n`
                })
                menu += `\n*8* - Ver mais dias\n\n_Digite o número do dia desejado._`
                await client.sendText(phone, menu)
                return
              }
            }

            // ─── ETAPA: Processar Escolha do Horário ──────────────────────────
            if (session.status === 'ESCOLHENDO_HORARIO') {
              const choice = parseInt(text, 10) - 1
              const slots = session.timeSlots

              if (isNaN(choice) || choice < 0 || choice >= slots.length) {
                await client.sendText(phone, '⚠️ Opção inválida. Digite o número correspondente ao horário.')
                return
              }

              const finalTime = slots[choice]
              const selectedService = await serviceRepository.findByTenantAndId(tenantId, session.serviceId)

              if (!selectedService) {
                await client.sendText(phone, 'O serviço selecionado não foi encontrado. Reinicie a conversa com "Oi".')
                await redisClient.del(`session:${phone}`)
                return
              }

              // ✅ CORREÇÃO: usa a data escolhida pelo usuário, não a data de hoje
              const chosenDate = session.chosenDate ? new Date(session.chosenDate) : new Date()
              const startTime = this.buildDateTime(finalTime, chosenDate)
              const endTime = new Date(startTime.getTime() + selectedService.durationMinutes * 60000)

              const now = new Date()
              if (startTime <= now) {
                await client.sendText(phone, '⏰ Esse horário já passou. Por favor, selecione outro horário disponível.')
                return
              }

              if (!session.professionalId) {
                await client.sendText(
                  phone,
                  '⚠️ Erro interno: profissional não selecionado. Reinicie a conversa com "Oi".'
                )
                await redisClient.del(`session:${phone}`)
                return
              }

              const conflicts = await appointmentRepository.findConflicts(
                tenantId,
                session.professionalId,
                startTime,
                endTime
              )
              if (conflicts && conflicts.length > 0) {
                await client.sendText(phone, '🚫 Desculpe, esse horário já foi reservado. Por favor, escolha outro horário.')
                return
              }

              if (!session.customerId) {
                const draft = {
                  serviceId: session.serviceId,
                  professionalId: session.professionalId,
                  startTime: startTime.toISOString(),
                  endTime: endTime.toISOString(),
                }

                await redisClient.set(
                  `session:${phone}`,
                  JSON.stringify({ status: 'AGUARDANDO_NOME_FINAL', appointmentDraft: draft }),
                  'EX',
                  1800
                )

                await client.sendText(
                  phone,
                  'Quase pronto! Para finalizar, por favor, *digite seu nome completo* para criarmos sua conta e confirmar o agendamento.'
                )
                return
              }

              await appointmentRepository.create({
                tenantId,
                customerId: session.customerId,
                professionalId: session.professionalId,
                serviceId: session.serviceId,
                startTime,
                endTime,
                status: 'scheduled',
              })

              await redisClient.del(`session:${phone}`)

              console.log(`[WHATSAPP] Agendamento concluído com sucesso para o número ${phone}`)

              await client.sendText(
                phone,
                `🎉 *Agendamento Confirmado com Sucesso!*\n\nSeu horário está garantido. Esperamos você em *${startTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}* às *${finalTime}*! 🟢`
              )
              return
            }
          } catch (err) {
            console.error('[ERRO CRÍTICO NO ONMESSAGE]:', err)
            await client.sendText(
              phone,
              '❌ Ops! Tivemos um problema técnico ao processar seu pedido. Por favor, tente enviar "Oi" novamente para recomeçar.'
            )
          }
        })
      })
      .catch((error) => {
        console.error(`[ERRO - ${tenantId}] Falha ao criar sessão estável:`, error)
        record.state = {
          status: 'error',
          message: `Erro ao inicializar o cliente WhatsApp: ${error}`,
        }
        scheduleReconnect()
      })

    return record
  }

  private scheduleReconnect(tenantId: string) {
    if (this.reconnectTimers.has(tenantId)) return

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(tenantId)
      const existing = this.sessions.get(tenantId)
      if (!existing) return

      console.log(`[LOG - ${tenantId}] Tentando reconectar sessão WhatsApp...`)
      try {
        await this.ensureClient(tenantId)
      } catch (error) {
        console.error(`[LOG - ${tenantId}] Reconexão falhou:`, error)
      }
    }, this.reconnectDelayMs)

    this.reconnectTimers.set(tenantId, timer)
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '')
    if (!cleaned) throw new Error('Número de telefone inválido')
    return `${cleaned}@c.us`
  }

  private normalizeRawPhone(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '')
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000)
  }

  /**
   * ✅ CORREÇÃO PRINCIPAL
   * O método antigo `buildDateTimeForToday` sempre usava `new Date()` (hoje),
   * ignorando a data que o usuário escolheu. Isso fazia agendamentos futuros
   * serem criados com a data de hoje, quebrando a verificação de conflitos
   * e de horário já passado.
   */
  private buildDateTime(time: string, date: Date): Date {
    const [hours, minutes] = time.split(':').map((v) => parseInt(v, 10))
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  private async computeAvailableSlots(
    tenantId: string,
    serviceId: string,
    professionalId: string,
    date: Date
  ): Promise<string[]> {
    const service = await serviceRepository.findByTenantAndId(tenantId, serviceId)
    const professional = await professionalRepository.findByTenantAndId(tenantId, professionalId)
    const tenant = await tenantRepository.findById(tenantId)
    if (!service || !professional || !tenant) {
      console.log(`[WHATSAPP] computeAvailableSlots - missing service/prof/tenant`)
      return []
    }

    if (!professional.isActive) {
      console.log(`[WHATSAPP] computeAvailableSlots - professional inactive`)
      return []
    }

    const offers = await professionalRepository.professionalOffersService(tenantId, professionalId, serviceId)
    if (!offers) {
      console.log(`[WHATSAPP] computeAvailableSlots - professional doesn't offer service`)
      return []
    }

    // Use same logic as /agendar public booking
    const dayKeys = getWeekdayKeys(date)
    const businessHoursValue = getNormalizedScheduleValue(tenant.businessHours, dayKeys) as any
    const workingHours = parseWorkingHoursRange(businessHoursValue)
    if (!workingHours) {
      console.log(`[WHATSAPP] No working hours configured for day, returning empty slots`)
      return []
    }

    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const workStart = new Date(date)
    const [startH, startM] = workingHours.start.split(':').map((v) => parseInt(v, 10))
    workStart.setHours(startH, startM, 0, 0)

    const workEnd = new Date(date)
    const [endH, endM] = workingHours.end.split(':').map((v) => parseInt(v, 10))
    workEnd.setHours(endH, endM, 0, 0)

    const now = new Date()
    const isToday = dayStart.toDateString() === new Date().toDateString()

    const tenantServices = await serviceRepository.findByTenant(tenantId)
    const positiveDurations = tenantServices.map((s) => Number(s.durationMinutes ?? 0)).filter((d) => d > 0)
    const minServiceMinutes =
      positiveDurations.length > 0
        ? Math.min(...positiveDurations)
        : Math.max(1, Number(service.durationMinutes ?? 1))
    const bufferMinutesInt = Math.max(0, Math.floor(Number(tenant.bufferMinutes ?? 0)))
    const slotStepMinutes = Math.max(1, Math.floor(minServiceMinutes) + bufferMinutesInt)

    const appointments = await appointmentRepository.findByProfessional(tenantId, professionalId)
    const activeAppointments = appointments.filter((a) => {
      const st = new Date(a.startTime)
      return (
        st >= dayStart &&
        st < dayEnd &&
        String(a.status ?? '').toLowerCase() !== 'cancelled' &&
        String(a.status ?? '').toLowerCase() !== 'no_show'
      )
    })

    const durationMs = Math.max(0, Number(service.durationMinutes ?? 0)) * 60 * 1000
    const bufferMs = bufferMinutesInt * 60 * 1000

    const slots: string[] = []
    for (
      let current = new Date(workStart);
      current.getTime() <= workEnd.getTime();
      current = this.addMinutes(current, slotStepMinutes)
    ) {
      const slotStart = new Date(current)
      const slotEnd = new Date(slotStart.getTime() + durationMs)

      if (slotStart.getTime() < workStart.getTime() || slotStart.getTime() > workEnd.getTime()) continue
      if (isToday && slotStart < now) continue

      const isValid = activeAppointments.every((appointment) => {
        const appointmentStart = new Date(appointment.startTime)
        const appointmentEnd = new Date(appointment.endTime)
        const blockedStart = new Date(appointmentStart.getTime() - bufferMs)
        const blockedEnd = new Date(appointmentEnd.getTime() + bufferMs)
        return !(slotStart < blockedEnd && slotEnd > blockedStart)
      })

      if (isValid) {
        const hh = String(slotStart.getHours()).padStart(2, '0')
        const mm = String(slotStart.getMinutes()).padStart(2, '0')
        slots.push(`${hh}:${mm}`)
      }
    }

    console.log(`[WHATSAPP] Slots generated - date=${date.toISOString()}, count=${slots.length}, hours=${workingHours.start}-${workingHours.end}`)
    return slots
  }

  private async findCustomerByPhone(tenantId: string, phone: string): Promise<Customer | null> {
    const result = await pool.query(
      `SELECT id, tenant_id as "tenantId", name, phone, email, birth_date as "birthDate", password_hash as "passwordHash", tags, last_visit as "lastVisit", created_at as "createdAt", deleted_at as "deletedAt"
       FROM customers
       WHERE tenant_id = $1 AND phone = $2
       LIMIT 1`,
      [tenantId, phone]
    )
    return result.rows[0] || null
  }
}

export const whatsappService = new WhatsAppService()