import mongoose from '../config/mongo.js';
import type { IStaff } from '../types/interface.js';
import { Schema } from 'mongoose';

const staffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    specialty: { type: String },
    phone: { type: String },
    email: { type: String },
    status: { type: String, enum: ['Available', 'Busy'], default: 'Available' },
    experience: { type: String },
    rating: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: 'staff',
  }
);

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);
