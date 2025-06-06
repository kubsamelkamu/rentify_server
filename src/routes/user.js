import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { changeUserRole } from '../controllers/admin.js'; 

const router = Router();

router.use(auth);

router.put('/users/:id/role', changeUserRole);

export default router;
