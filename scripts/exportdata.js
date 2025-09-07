import axios from 'axios';
import { writeFileSync, createReadStream, unlinkSync } from 'fs';
import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

async function getSuperAdminToken() {
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, role: true }
  });
  if (!superAdmin) throw new Error('Super admin not found');
  const payload = { userId: superAdmin.id, email: superAdmin.email, role: superAdmin.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function exportAndSend() {
  try {
    const JWT_TOKEN = await getSuperAdminToken();
    const { data } = await axios.get('https://hrp-server-api.onrender.com/api/recommendation/export-recommendation-data', {
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    const form = new FormData();

    for (const key of Object.keys(data)) {
      const filePath = `./temp_${key}.csv`;
      writeFileSync(filePath, data[key]);
      form.append(key, createReadStream(filePath));
    }


    await axios.post('https://rentify-recommendor-1.onrender.com/upload-data', form, {
      headers: form.getHeaders(),
    });

    Object.keys(data).forEach(key => unlinkSync(`./temp_${key}.csv`));
    console.log('Recommendation data sent successfully!');
  } catch (err) {
    console.error('Error sending recommendation data:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportAndSend();