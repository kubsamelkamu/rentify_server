import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/booking.js';
import paymentRoutes from './routes/payment.js';
import profileRoutes from './routes/profile.js';
import propertyRoutes from './routes/property.js';
import reviewRoutes from './routes/review.js';

dotenv.config();
const app = express();

export const prisma = new PrismaClient();

app.use(cors());
app.use(json());
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/reviews', reviewRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

export default app;