import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {getAllUsers,deleteUser, getAllProperties,deletePropertyByAdmin, 
getAllBookings,updateBookingStatus,getAllReviews,deleteReviewByAdmin,getSiteMetrics} from '../controllers/admin.js';

const router = Router();

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
});

router.get('/users', getAllUsers);
router.get('/properties', getAllProperties);
router.get('/bookings', getAllBookings);
router.get('/reviews', getAllReviews);
router.get('/metrics', getSiteMetrics);
router.put('/bookings/:id/status', updateBookingStatus);
router.delete('/users/:id', deleteUser);
router.delete('/properties/:id', deletePropertyByAdmin);
router.delete('/reviews/:id', deleteReviewByAdmin);

export default router;
