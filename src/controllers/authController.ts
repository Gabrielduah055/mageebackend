import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/users.js';
import { sendOtpEmail } from '../services/brevo.js';

dotenv.config();

function getSecret(): string {
  return process.env['JWT_SECRET'] ?? '';
}

function signToken(id: string, email: string, role: string): string {
  return jwt.sign({ id, email, role }, getSecret(), { expiresIn: '7d' });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface PendingPayload {
  type: 'pending';
  name: string;
  email: string;
  passwordHash: string;
  otp: string;
  otpExpiry: number; // Unix ms
}

function signPendingToken(payload: Omit<PendingPayload, 'type'>): string {
  return jwt.sign({ type: 'pending', ...payload }, getSecret(), { expiresIn: '15m' });
}

function decodePendingToken(token: string): PendingPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as PendingPayload;
    if (decoded.type !== 'pending') return null;
    return decoded;
  } catch {
    return null;
  }
}

// POST /auth/register
// Validates input, sends OTP, returns a pendingToken. No DB write yet.
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
    const passwordHash = await bcrypt.hash(password, salt);

    const otp = generateOtp();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    const pendingToken = signPendingToken({
      name,
      email: email.toLowerCase(),
      passwordHash,
      otp,
      otpExpiry,
    });

    await sendOtpEmail(email.toLowerCase(), name, otp);

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      pendingToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
}

// POST /auth/verify-otp
// Validates OTP from pendingToken, then creates the user in DB.
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { pendingToken, otp } = req.body as { pendingToken?: string; otp?: string };

  if (!pendingToken || !otp) {
    res.status(400).json({ error: 'pendingToken and otp are required' });
    return;
  }

  const pending = decodePendingToken(pendingToken);
  if (!pending) {
    res.status(400).json({ error: 'Invalid or expired session. Please register again.' });
    return;
  }

  if (Date.now() > pending.otpExpiry) {
    res.status(400).json({ error: 'OTP has expired. Please register again to get a new code.' });
    return;
  }

  if (pending.otp !== otp) {
    res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    return;
  }

  try {
    const existing = await User.findOne({ email: pending.email });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password_hash: pending.passwordHash,
      role: 'user',
      isVerified: true,
    });

    const token = signToken(user._id.toString(), user.email, user.role);
    res.status(201).json({
      message: 'Email verified. Registration successful.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: true },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /auth/resend-otp
// Issues a fresh OTP and returns a new pendingToken.
export async function resendOtp(req: Request, res: Response): Promise<void> {
  const { pendingToken } = req.body as { pendingToken?: string };

  if (!pendingToken) {
    res.status(400).json({ error: 'pendingToken is required' });
    return;
  }

  const pending = decodePendingToken(pendingToken);
  if (!pending) {
    res.status(400).json({ error: 'Invalid or expired session. Please register again.' });
    return;
  }

  // Rate limit: block resend if OTP was issued less than 1 minute ago
  const issuedAt = pending.otpExpiry - 10 * 60 * 1000;
  const oneMinuteAfterIssue = issuedAt + 60 * 1000;
  if (Date.now() < oneMinuteAfterIssue) {
    const secondsLeft = Math.ceil((oneMinuteAfterIssue - Date.now()) / 1000);
    res.status(429).json({ error: `Please wait ${secondsLeft}s before requesting a new code.` });
    return;
  }

  try {
    const otp = generateOtp();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    const newPendingToken = signPendingToken({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      otp,
      otpExpiry,
    });

    await sendOtpEmail(pending.email, pending.name, otp);

    res.json({
      message: 'A new verification code has been sent to your email.',
      pendingToken: newPendingToken,
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
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
