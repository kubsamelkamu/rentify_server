import { Router } from 'express';
import { addSubscriber } from '../controllers/newsletterController.js';

const router = Router();
router.post('/', addSubscriber);

export default router;
