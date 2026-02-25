import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectMongo } from '../config/mongo.js';
import { User } from '../models/users.js';
import mongoose from 'mongoose';

dotenv.config();

async function seed() {
  await connectMongo();

  const name = process.env['ADMIN_NAME'] ?? 'Admin';
  const email = (process.env['ADMIN_EMAIL'] ?? 'admin@magee.com').toLowerCase();
  const password = process.env['ADMIN_PASSWORD'] ?? 'Admin@1234';

  const existing = await User.findOne({ email });

  if (existing) {
    console.log('Admin already exists. Skipping seed.');
    await mongoose.disconnect();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  await User.create({ name, email, password_hash, role: 'admin' });

  console.log(`Admin seeded successfully: ${email}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
