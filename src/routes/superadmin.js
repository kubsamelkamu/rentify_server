import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {getAllAdmins,createAdminUser,deleteAdminUser,} from '../controllers/superAdmin.js';

const router = Router();

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super-admins only' });
  }
  next();
});

router.get('/admins', getAllAdmins);
router.post('/admins', createAdminUser);
router.delete('/admins/:id', deleteAdminUser);

export default router;
