import { Request, Response } from 'express'
import { whatsappService } from '../infrastructure/whatsapp'

export class WhatsAppController {
  async getStatus(req: Request, res: Response) {
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' })
    }

    try {
      const status = await whatsappService.getStatus(tenantId)
      res.setHeader('Cache-Control', 'no-store')
      console.log(`[API - getStatus] tenant=${tenantId} returning state:`, JSON.stringify(status).slice(0, 1000))
      return res.json(status)
    } catch (error: any) {
      console.error('Error getting WhatsApp status:', error)
      return res.status(500).json({ 
        status: 'error', 
        message: 'Falha ao buscar o status do WhatsApp.' 
      })
    }
  }

  async getQr(req: Request, res: Response) {
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' })
    }

    try {
      const status = await whatsappService.getQr(tenantId)
      res.setHeader('Cache-Control', 'no-store')
      console.log(`[API - getQr] tenant=${tenantId} returning state:`, JSON.stringify(status).slice(0, 1000))
      return res.json(status)
    } catch (error: any) {
      console.error('Error getting WhatsApp QR code:', error)
      return res.status(500).json({ 
        status: 'error', 
        message: 'Falha ao recuperar o QR Code do WhatsApp.' 
      })
    }
  }

  async startSession(req: Request, res: Response) {
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' })
    }

    try {
      const status = await whatsappService.startSession(tenantId)
      return res.json(status)
    } catch (error: any) {
      console.error('Error starting WhatsApp session:', error)
      return res.status(500).json({ 
        status: 'error', 
        message: 'Falha ao iniciar a sessão do WhatsApp.' 
      })
    }
  }

  async sendMessage(req: Request, res: Response) {
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' })
    }

    const { number, text } = req.body
    if (!number || !text) {
      return res.status(400).json({ error: 'Number and text are required' })
    }

    try {
      await whatsappService.sendMessage(tenantId, number, text)
      return res.json({ success: true })
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error)
      return res.status(500).json({ error: String(error.message || error) })
    }
  }

  async disconnect(req: Request, res: Response) {
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' })
    }

    try {
      await whatsappService.disconnect(tenantId)
      return res.json({ success: true, message: 'WhatsApp desconectado com sucesso' })
    } catch (error: any) {
      console.error('Error disconnecting WhatsApp:', error)
      return res.status(500).json({ 
        error: 'Falha ao desconectar o WhatsApp',
        details: String(error.message || error)
      })
    }
  }
}