import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../app.js';
import crypto from 'crypto';
import cloudinary from '../config/cloudinary.js';
import {sendResetPasswordEmail,sendVerificationEmail,  sendLandlordApplicationPendingAdminEmail,
sendLandlordApplicationReceivedEmail,} from '../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'TENANT' },
    });

    const io = req.app.get('io');  
    io.emit('admin:newUser', {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      createdAt: user.createdAt,
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;

    await sendVerificationEmail(user.name, user.email, verificationUrl);

    return res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { isVerified: true },
    });
    return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch {
    return res.status(400).json({ error: 'Invalid or expired verification token.' });
  }
};

export const forgotPassword = async (req, res) => {

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({ message: 'If that email exists, you’ll receive a reset link shortly.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiresAt: expiresAt }
    });

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    await sendResetPasswordEmail(user.name, user.email, resetUrl);

    return res.status(200).json({ message: 'If that email exists, you’ll receive a reset link shortly.' });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() }
      }
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiresAt: null }
    });
    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const applyForLandlord = async (req, res) => {

  const userId = req.user.userId;
  const files  = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one document.' });
  }

  try {
 
    await prisma.roleRequest.upsert({
      where:  { userId },
      update: { requestedRole: 'LANDLORD', status: 'PENDING' },
      create: { userId, requestedRole: 'LANDLORD', status: 'PENDING' },
    });

    await Promise.all(
      files.map((file) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'landlord_docs' },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(file.buffer);
        }).then((uploadResult) =>
          prisma.landlordDoc.create({
            data: {
              userId,
              publicId: uploadResult.public_id,
              url:      uploadResult.secure_url,
              docType:  file.fieldname,
            },
          })
        )
      )
    );

    try {
      await sendLandlordApplicationPendingAdminEmail({
        applicantName:  req.user.name,
        applicantEmail: req.user.email,
        reviewLink:     `${process.env.FRONTEND_URL}/admin/landlord-requests`,
      });
    } catch (emailErr) {
      console.error('Failed to email admin about new landlord request:', emailErr);
    }

    try {
      await sendLandlordApplicationReceivedEmail({
        userName:    req.user.name,
        toEmail:     req.user.email,
        profileLink: `${process.env.FRONTEND_URL}/profile`,          
      });
    } catch (emailErr) {
      console.error('Failed to email applicant confirmation:', emailErr);
    }

    return res.json({ message: 'Application submitted, awaiting admin review.' });
  } catch (err) {
    console.error('applyForLandlord error:', err);
    return res.status(500).json({ error: 'Failed to submit application.' });
  }
};

export const logout = async (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};
