import { Router } from 'express';
import { register, login, getMe, updateMe, verifyOtp, resendOtp } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.post('/verify-otp', authenticate, verifyOtp);
router.post('/resend-otp', authenticate, resendOtp);

export default router;
