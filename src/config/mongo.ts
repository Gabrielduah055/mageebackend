import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function connectMongo(): Promise<void> {
  const mongoUri = process.env['MONGO_URI'];
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

export default mongoose;