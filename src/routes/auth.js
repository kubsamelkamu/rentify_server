import { Router } from 'express';
import multer from 'multer';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  applyForLandlord, 
} from '../controllers/auth.js';
import  auth  from '../middlewares/auth.js';

const router = Router();
const upload = multer();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/apply-landlord',auth,upload.array('docs'),applyForLandlord);

export default router;
