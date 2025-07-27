import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {
  getAllUsers,
  exportUsers,
  deleteUser,
  listLandlordRequests,
  approveLandlord,
  rejectLandlord,

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

router.get('/metrics', getSiteMetrics);

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      next();
  }else{
      return res.status(403).json({ error: 'Admins' });
  }

});

router.get('/users', getAllUsers);
router.get(
  '/users/export',
  exportUsers
);
router.delete('/users/:id', deleteUser);

router.get(
  '/landlord-requests',
  listLandlordRequests
);

router.post(
  '/landlord-requests/:userId/approve',
  approveLandlord
);

router.post(
  '/landlord-requests/:userId/reject',
  rejectLandlord
);

router.get('/properties', getAllProperties);
router.post('/properties/:id/approve', approveProperty); 
router.post('/properties/:id/reject', rejectProperty);   
router.delete('/properties/:id', deletePropertyByAdmin);

router.get('/bookings', getAllBookings);
router.put('/bookings/:id/status', updateBookingStatus);

router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReviewByAdmin);



export default router;
