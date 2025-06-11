import { Router } from 'express';
import { register,login,verifyEmail,forgotPassword ,resetPassword} from '../controllers/auth.js';

const router = Router();

router.post('/register', register);
router.get('/verify', verifyEmail); 
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login', login);

export default router;