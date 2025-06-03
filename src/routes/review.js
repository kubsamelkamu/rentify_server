import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {upsertReview,getPropertyReviews,deleteReview,} from '../controllers/review.js';

const router = Router();

router.use(auth);

router.post('/:propertyId', upsertReview);
router.put('/:propertyId', upsertReview);
router.get('/:propertyId', getPropertyReviews);
router.delete('/:propertyId', deleteReview);

export default router;
