import mongoose from '../config/mongo.js';
import type { IUser } from '../types/interface.js';
import { Schema } from 'mongoose';

const userSchema = new Schema<IUser>(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, index: true },
      password_hash: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
      created_at: { type: Date, default: Date.now },
    },
    {
      collection: 'users',
    }
  );
  
  export const User = mongoose.model<IUser>('User', userSchema);