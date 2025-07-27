import { prisma } from '../app.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;

export const getAllAdmins = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page,  10) || 1,  1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip  = (page - 1) * limit;

    const total = await prisma.user.count({ where: { role: 'ADMIN' } });
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      skip,
      take: limit,
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      data: admins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return res.status(500).json({ error: 'Could not fetch admins' });
  }
};

export const createAdminUser = async (req, res) => {

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only super‑admins can create admins' });
  }

  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name, and password are required' });
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'User with that email already exists' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
        role: 'ADMIN',
        isVerified: true,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.status(201).json({ user, token });
  } catch {
    return res.status(500).json({ error: 'Could not create admin' });
  }
};

export const deleteAdminUser = async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only super‑admins can delete admins' });
  }

  const targetId = req.params.id;
  if (req.user.id === targetId) {
    return res.status(400).json({ error: 'Cannot delete your own super‑admin account' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    await prisma.user.delete({ where: { id: targetId } });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteAdminUser error:', err);
    return res.status(500).json({ error: 'Could not delete admin' });
  }
};
