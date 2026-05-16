import express from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { WhatsAppController } from '../controllers/whatsapp.controller'

const router = express.Router()
const controller = new WhatsAppController()

router.get('/status', authenticate, controller.getStatus.bind(controller))
router.get('/qr', authenticate, controller.getQr.bind(controller))
router.post('/send', authenticate, controller.sendMessage.bind(controller))

export default router
