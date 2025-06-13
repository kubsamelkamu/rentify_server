import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { initiatePayment, handleWebhook } from '../controllers/payment.js';

const router = Router();

router.post('/initiate', auth, initiatePayment);
router.post('/webhook', (req, res) => {
  console.log('✅ Webhook hit received! Body:', req.body);
  res.json({ message: 'Webhook received!' });
});

export default router;
