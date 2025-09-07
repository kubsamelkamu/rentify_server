import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import adminRoutes from './routes/admin.js';
import superAdminRoutes from './routes/superadmin.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/booking.js';
import contactRoutes from './routes/contact.js';
import newsletterRoutes from './routes/newsletter.js';
import paymentRoutes from './routes/payment.js';
import profileRoutes from './routes/profile.js';
import propertyRoutes from './routes/property.js';
import reviewRoutes from './routes/review.js';
import userRoutes from './routes/user.js';
import recommendorRoutes from './routes/recommendor.js';
import recommendationProxy from './routes/getrecommend.js'

dotenv.config();
const app = express();

export const prisma = new PrismaClient();

app.use(cors());
app.use(json());

app.use('/api/recommendation-proxy', recommendationProxy);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api', userRoutes);
app.use('/api/recommendation', recommendorRoutes);
app.use('/api/recommendation-proxy', recommendationProxy);
app.get('/health/status', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy!' });
});

export default app;
