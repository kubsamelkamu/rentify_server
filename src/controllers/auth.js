import jwt from 'jsonwebtoken'; 
import bcrypt from 'bcrypt';
import { prisma } from '../app.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TENANT' 
      },
    });

    res.status(201).json({ message: 'User registered successfully',
       user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        role: user.role
      }
    });
     
  } catch (error) {
    res.status(500).json(error.message);
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id }, 
      JWT_SECRET,
      { expiresIn: '1d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name, 
        email: user.email,
        role: user.role 
      },
    });

  } catch (error) {
    res.status(500).json(error.message);
  }
};

