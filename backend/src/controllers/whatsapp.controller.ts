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
      res.json(status)
    } catch (error) {
      console.error('Error getting WhatsApp status:', error)
      res.status(500).json({ error: 'Failed to get WhatsApp status' })
    }
  }

  async getQr(req: Request, res: Response) {
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' })
    }

    try {
      const status = await whatsappService.getQr(tenantId)
      res.json(status)
    } catch (error) {
      console.error('Error getting WhatsApp QR code:', error)
      res.status(500).json({ error: 'Failed to get WhatsApp QR code' })
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
      res.json({ success: true })
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
      res.status(500).json({ error: String(error) })
    }
  }
}
