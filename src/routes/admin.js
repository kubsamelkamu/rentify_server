import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {
  getAllUsers,
  deleteUser,

  getAllProperties,
  approveProperty,    
  rejectProperty,    
  deletePropertyByAdmin,

  getAllBookings,
  updateBookingStatus,
  getAllReviews,
  deleteReviewByAdmin,
  getSiteMetrics,
} from '../controllers/admin.js';

const router = Router();

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
});

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

router.get('/properties', getAllProperties);
router.post('/properties/:id/approve', approveProperty); 
router.post('/properties/:id/reject', rejectProperty);   
router.delete('/properties/:id', deletePropertyByAdmin);

router.get('/bookings', getAllBookings);
router.put('/bookings/:id/status', updateBookingStatus);

router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReviewByAdmin);

router.get('/metrics', getSiteMetrics);

export default router;
