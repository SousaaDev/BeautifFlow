import { Router } from 'express';
import {
  login,
  refreshToken,
  logout,
  register,
  me,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put('/me', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

export default router;