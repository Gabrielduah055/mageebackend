import mongoose from '../config/mongo.js';
import type { ISettings } from '../types/interface.js';
import { Schema } from 'mongoose';

const settingsSchema = new Schema<ISettings>(
  {
    salonName: { type: String, default: '' },
    ownerName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    openTime: { type: String, default: '' },
    closeTime: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
  },
  {
    collection: 'settings',
  }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
