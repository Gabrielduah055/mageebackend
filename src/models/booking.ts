import mongoose from '../config/mongo.js';
import { Schema } from 'mongoose';
import type { IBooking } from '../types/interface.js';


const bookingSchema = new Schema<IBooking>(
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
      service_type: { type: String, enum: ['home', 'shop'], required: true },
      booking_date: { type: String, required: true },
      booking_time: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending',
      },
      address: { type: String },
      image_url: { type: String },
      notes: { type: String },
      created_at: { type: Date, default: Date.now },
    },
    {
      collection: 'bookings',
    }
  );
  
  export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);

