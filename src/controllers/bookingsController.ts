import type { Request, Response } from 'express';
import { Booking } from '../models/booking.js';
import { Service } from '../models/service.js';

export async function createBooking(req: Request, res: Response): Promise<void> {
  const { service_id, service_type, booking_date, booking_time, address, notes, image_url } = req.body as {
    service_id?: string;
    service_type?: string;
    booking_date?: string;
    booking_time?: string;
    address?: string;
    notes?: string;
    image_url?: string;
  };

  if (!service_id || !service_type || !booking_date || !booking_time) {
    res.status(400).json({ error: 'service_id, service_type, booking_date, and booking_time are required' });
    return;
  }

  if (!['home', 'shop'].includes(service_type)) {
    res.status(400).json({ error: 'service_type must be "home" or "shop"' });
    return;
  }

  if (service_type === 'home' && !address) {
    res.status(400).json({ error: 'address is required for home service' });
    return;
  }

  try {
    const serviceDoc = await Service.findById(service_id);
    if (!serviceDoc) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    if (service_type === 'shop') {
      const conflict = await Booking.findOne({
        service: service_id,
        booking_date,
        booking_time,
        service_type: 'shop',
        status: { $ne: 'cancelled' },
      });
      if (conflict) {
        res.status(409).json({ error: 'This time slot is already booked. Please choose a different time.' });
        return;
      }
    }

    const booking = await Booking.create({
      user: req.user!.id,
      service: service_id,
      service_type,
      booking_date,
      booking_time,
      address: address ?? undefined,
      notes: notes ?? undefined,
      image_url: image_url ?? undefined,
    });

    res.status(201).json({ booking });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMyBookings(req: Request, res: Response): Promise<void> {
  try {
    const bookings = await Booking.find({ user: req.user!.id })
      .populate('service', 'name price duration_minutes')
      .sort({ booking_date: -1, booking_time: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllBookings(_req: Request, res: Response): Promise<void> {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('service', 'name price duration_minutes')
      .sort({ booking_date: -1, booking_time: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateBookingStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status?: string };

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const existing = await Booking.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!allowedTransitions[existing.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition from "${existing.status}" to "${status}"` });
      return;
    }

    existing.status = status as 'pending' | 'confirmed' | 'completed' | 'cancelled';
    await existing.save();

    res.json({ booking: existing });
  } catch (err) {
    console.error('Update booking status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
