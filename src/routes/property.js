import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { createProperty, exportProperties, getAllProperties, getPropertyById, updateProperty, deleteProperty } from '../controllers/property.js';
import { upload } from '../middlewares/upload.js';
import { uploadPropertyImages } from '../controllers/property.js';
import { sendMessage } from '../controllers/message.js';

const router = Router();

router.post('/',auth, createProperty);
router.get('/', getAllProperties);
router.get('/export', exportProperties);
router.get('/:id', getPropertyById);
router.put('/:id', auth, updateProperty);
router.delete('/:id', auth, deleteProperty);
router.post('/:id/images', auth, upload.array('images', 2), uploadPropertyImages);

router.post('/:id/messages',auth, sendMessage);

export default router;
