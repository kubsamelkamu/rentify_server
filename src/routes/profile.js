import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { getProfile, updateProfile } from '../controllers/profile.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.get('/me', auth, getProfile);
router.put('/me',auth,upload.single('profilePhoto'),updateProfile);

export default router;
