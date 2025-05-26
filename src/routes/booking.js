import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {requestBooking,getPropertyBookings,confirmBooking,rejectBooking,getUserBookings, cancelBooking,getLandlordBookings,} from '../controllers/booking.js';

const router = Router();

router.use(auth);

router.post('/', requestBooking);
router.get('/property/:propertyId', getPropertyBookings);
router.put('/:id/confirm', confirmBooking);
router.put('/:id/reject',  rejectBooking);
router.get('/user', getUserBookings);
router.delete('/:id', cancelBooking);
router.get('/landlord',    getLandlordBookings);


export default router;
