import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';           
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const email    = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('✅ Super‑admin already exists:', email);
    return;
  }

  const hashed = await hash(password, 12);  
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: 'SUPER_ADMIN',
      name: 'Platform Super‑Admin',
      isVerified: true,
    },
  });
  console.log('🌟 Super‑admin created:', email);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
