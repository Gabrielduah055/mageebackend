import mongoose from 'mongoose';

const {Schema} = mongoose;

export interface IUser {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password_hash: string;
    phone?: string;
    role: 'user' | 'admin';
    isVerified: boolean;
    otp?: string | null;
    otpExpiry?: Date | null;
    created_at: Date;
}

export interface IService {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    category?: string;
    price: number;
    duration_minutes: number;
    created_at: Date;
}

export interface IBooking {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    service: mongoose.Types.ObjectId;
    service_type: 'home' | 'shop';
    booking_date: string;
    booking_time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    address?: string;
    image_url?: string;
    notes?: string;
    created_at: Date;
}

export interface IStaff {
    _id: mongoose.Types.ObjectId;
    name: string;
    role: string;
    specialty?: string;
    phone?: string;
    email?: string;
    status: 'Available' | 'Busy';
    experience?: string;
    rating: number;
    created_at: Date;
}

export interface ISettings {
    _id: mongoose.Types.ObjectId;
    salonName: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    openTime: string;
    closeTime: string;
    logoUrl: string;
}
