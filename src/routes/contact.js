import { Router } from 'express';
import { sendContact } from '../controllers/contact.js';

const router = Router();
router.post('/', sendContact);

export default router;
