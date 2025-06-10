import { Router } from 'express';
import { register,login,verifyEmail } from '../controllers/auth.js';
const router = Router();

router.post('/register', register);
router.get('/verify', verifyEmail);  
router.post('/login', login);

export default router;