import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../app.js';
import crypto from 'crypto';
import cloudinary from '../config/cloudinary.js';
import {sendResetPasswordEmail,sendLandlordApplicationPendingAdminEmail,
sendLandlordApplicationReceivedEmail,sendVerificationOtpEmail} from '../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET;


const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString(); 


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
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TENANT',
        isVerified: false,
        verificationOtp: otp,
        verificationOtpExpiresAt: otpExpiresAt,
      },
    });

    const io = req.app.get('io');
    io.emit('admin:newUser', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
    await sendVerificationOtpEmail(user.name, user.email, otp);

    return res.status(201).json({
      message: 'User registered successfully. Please check your email for the OTP to verify your account.',
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


export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    if (!user.verificationOtp || !user.verificationOtpExpiresAt) {
      return res.status(400).json({ message: 'No OTP found, please request a new one' });
    }

    if (user.verificationOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.verificationOtpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired, request a new one' });
    }

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationOtp: null,
        verificationOtpExpiresAt: null,
      },
    });

    return res.status(200).json({ message: 'Account verified successfully' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ message: 'Failed to verify OTP", error: error.message' });
  }
};

export const resendOtp = async (req, res) => {

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.update({
      where: { email },
      data: {
        verificationOtp: otp,
        verificationOtpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendVerificationOtpEmail(user.name, user.email, otp);

    return res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    return res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
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
