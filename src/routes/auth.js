import { Router } from 'express';
import multer from 'multer';
import {register,login,verifyOtp ,forgotPassword,resetPassword,applyForLandlord, resendOtp ,verifyResetOtp } from '../controllers/auth.js';
import  auth  from '../middlewares/auth.js';

const router = Router();
const upload = multer();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp );
router.post('/resend-otp', resendOtp ); 
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/apply-landlord',auth,upload.array('docs'),applyForLandlord);

export default router;
