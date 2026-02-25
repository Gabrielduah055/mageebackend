import mongoose from '../config/mongo.js';
import type { IService } from '../types/interface.js';
import { Schema } from 'mongoose';

const serviceSchema = new Schema<IService>(
    {
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      duration_minutes: { type: Number, required: true },
      created_at: { type: Date, default: Date.now },
    },
    {
      collection: 'services',
    }
  );
  
  export const Service = mongoose.model<IService>('Service', serviceSchema);