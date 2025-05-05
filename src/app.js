import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const app = express();

export const prisma = new PrismaClient();

app.use(cors());
app.use(json());

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

export default app;