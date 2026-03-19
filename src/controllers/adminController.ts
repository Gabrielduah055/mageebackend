import type { Request, Response } from 'express';
import { Booking } from '../models/booking.js';
import { Service } from '../models/service.js';
import { User } from '../models/users.js';

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayBookings, totalClients, activeServices, allBookingsThisMonth, recentBookings, allBookings] =
      await Promise.all([
        Booking.countDocuments({ booking_date: today }),
        User.countDocuments({ role: 'user' }),
        Service.countDocuments(),
        Booking.find({
          status: { $in: ['confirmed', 'completed'] },
          booking_date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] },
        }).populate('service', 'price'),
        Booking.find()
          .sort({ created_at: -1 })
          .limit(5)
          .populate('user', 'name email')
          .populate('service', 'name price duration_minutes'),
        Booking.find({ status: { $ne: 'cancelled' } }).populate('service', 'name'),
      ]);

    const monthRevenue = allBookingsThisMonth.reduce((sum: number, b: any) => {
      return sum + (b.service?.price ?? 0);
    }, 0);

    // Count bookings per service for top services
    const serviceCounts: Record<string, { name: string; count: number }> = {};
    for (const b of allBookings as any[]) {
      if (b.service) {
        const id = b.service._id.toString();
        if (!serviceCounts[id]) serviceCounts[id] = { name: b.service.name, count: 0 };
        serviceCounts[id].count++;
      }
    }
    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => ({ name: s.name, bookings: s.count }));

    const mappedBookings = (recentBookings as any[]).map((b) => ({
      _id: b._id,
      client: b.user?.name ?? 'Unknown',
      service: b.service?.name ?? 'Unknown',
      date: b.booking_date,
      time: b.booking_time,
      status: b.status,
    }));

    res.json({
      todayBookings,
      totalClients,
      monthRevenue: `GH₵ ${monthRevenue.toLocaleString()}`,
      activeServices,
      recentBookings: mappedBookings,
      topServices,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAdminBookings(_req: Request, res: Response): Promise<void> {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate('service', 'name price duration_minutes')
      .sort({ booking_date: -1, booking_time: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error('Get admin bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateAdminBookingStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status?: string };

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!allowedTransitions[booking.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition from "${booking.status}" to "${status}"` });
      return;
    }

    booking.status = status as 'pending' | 'confirmed' | 'completed' | 'cancelled';
    await booking.save();

    res.json({ booking });
  } catch (err) {
    console.error('Update booking status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getClients(_req: Request, res: Response): Promise<void> {
  try {
    const users = await User.find({ role: 'user' }).select('-password_hash').sort({ created_at: -1 });

    const clientsWithStats = await Promise.all(
      users.map(async (user) => {
        const bookings = await Booking.find({ user: user._id })
          .populate('service', 'price')
          .sort({ booking_date: -1 });

        const totalSpent = bookings.reduce((sum: number, b: any) => sum + (b.service?.price ?? 0), 0);
        const lastVisit = bookings.length > 0 ? bookings[0].booking_date : null;

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: (user as any).phone ?? '',
          bookingCount: bookings.length,
          totalSpent: `GH₵ ${totalSpent.toLocaleString()}`,
          lastVisit: lastVisit ?? 'No visits yet',
          joinedAt: user.created_at,
        };
      })
    );

    res.json({ clients: clientsWithStats });
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getClientById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  try {
    const user = await User.findById(id).select('-password_hash');
    if (!user || user.role === 'admin') {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const bookings = await Booking.find({ user: id })
      .populate('service', 'name price duration_minutes')
      .sort({ booking_date: -1 });

    const totalSpent = bookings.reduce((sum: number, b: any) => sum + (b.service?.price ?? 0), 0);

    res.json({
      client: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: (user as any).phone ?? '',
        joinedAt: user.created_at,
        bookingCount: bookings.length,
        totalSpent: `GH₵ ${totalSpent.toLocaleString()}`,
      },
      bookings,
    });
  } catch (err) {
    console.error('Get client by id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAdminServices(_req: Request, res: Response): Promise<void> {
  try {
    const services = await Service.find().sort({ created_at: 1 });
    res.json({ services });
  } catch (err) {
    console.error('Get admin services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createAdminService(req: Request, res: Response): Promise<void> {
  const { name, description, category, price, duration_minutes } = req.body as {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
    duration_minutes?: number;
  };

  if (!name || price === undefined || !duration_minutes) {
    res.status(400).json({ error: 'name, price, and duration_minutes are required' });
    return;
  }

  try {
    const service = await Service.create({
      name,
      description: description ?? undefined,
      category: category ?? '',
      price: Number(price),
      duration_minutes: Number(duration_minutes),
    });

    res.status(201).json({ service });
  } catch (err) {
    console.error('Create admin service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateAdminService(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { name, description, category, price, duration_minutes } = req.body as {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
    duration_minutes?: number;
  };

  try {
    const service = await Service.findByIdAndUpdate(
      id,
      { $set: { name, description, category, price: Number(price), duration_minutes: Number(duration_minutes) } },
      { new: true, runValidators: true }
    );

    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    res.json({ service });
  } catch (err) {
    console.error('Update admin service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteAdminService(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  try {
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Delete admin service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
