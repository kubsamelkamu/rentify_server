import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { applyForLandlord,getProfile, updateProfile } from '../controllers/profile.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.get('/me', auth, getProfile);
router.put('/me',auth,upload.single('profilePhoto'),updateProfile);
router.post(
  '/users/apply-landlord',
  auth,
  upload.array('docs'),
  applyForLandlord
);

export default router;
