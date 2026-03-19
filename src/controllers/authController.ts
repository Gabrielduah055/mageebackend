import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/users.js';
import { sendOtpEmail } from '../services/brevo.js';

dotenv.config();

function signToken(id: string, email: string, role: string): string {
  const secret = process.env['JWT_SECRET'] ?? '';
  return jwt.sign({ id, email, role }, secret, { expiresIn: '7d' });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password_hash,
      role: 'user',
      isVerified: false,
      otp,
      otpExpiry,
    });

    // Send OTP email (non-blocking — don't fail registration if email fails)
    sendOtpEmail(user.email, user.name, otp).catch((err) => {
      console.error('Failed to send OTP email:', err);
    });

    const token = signToken(user._id.toString(), user.email, user.role);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: false },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { otp } = req.body as { otp?: string };

  if (!otp) {
    res.status(400).json({ error: 'otp is required' });
    return;
  }

  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.json({ message: 'Account already verified', isVerified: true });
      return;
    }

    if (!user.otp || !user.otpExpiry) {
      res.status(400).json({ error: 'No OTP found. Please request a new one.' });
      return;
    }

    if (new Date() > user.otpExpiry) {
      res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      return;
    }

    if (user.otp !== otp) {
      res.status(400).json({ error: 'Invalid OTP. Please try again.' });
      return;
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = signToken(user._id.toString(), user.email, user.role);
    res.json({
      message: 'Email verified successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: true },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Account is already verified' });
      return;
    }

    // Rate limit: only resend if OTP expired or was sent more than 1 minute ago
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (user.otpExpiry && user.otpExpiry > oneMinuteAgo) {
      const secondsLeft = Math.ceil((user.otpExpiry.getTime() - oneMinuteAgo.getTime()) / 1000);
      res.status(429).json({ error: `Please wait before requesting a new code. Try again in ${secondsLeft}s.` });
      return;
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendOtpEmail(user.email, user.name, otp).catch((err) => {
      console.error('Failed to send OTP email:', err);
    });

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user._id.toString(), user.email, user.role);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const { name, phone } = req.body as { name?: string; phone?: string };

  try {
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: { name, phone } },
      { new: true }
    ).select('-password_hash -otp -otpExpiry');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('UpdateMe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-password_hash -otp -otpExpiry');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
