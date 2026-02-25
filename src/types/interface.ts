import mongoose from 'mongoose';

const {Schema} = mongoose;

export interface IUser {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password_hash: string;
    role: 'user' | 'admin';
    created_at: Date;
}

export interface IService {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    price: number;
    duration_minutes: number;
    created_at: Date;
  }

  export interface IBooking {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    service: mongoose.Types.ObjectId;
    service_type: 'home' | 'shop';
    booking_date: string;   // keep as string like the API currently expects
    booking_time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    address?: string;
    image_url?: string;
    notes?: string;
    created_at: Date;
  }
  