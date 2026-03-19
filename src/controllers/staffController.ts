import type { Request, Response } from 'express';
import { Staff } from '../models/staff.js';

export async function getStaff(_req: Request, res: Response): Promise<void> {
  try {
    const staff = await Staff.find().sort({ created_at: -1 });
    res.json({ staff });
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createStaff(req: Request, res: Response): Promise<void> {
  const { name, role, specialty, phone, email, experience, rating, status } = req.body as {
    name?: string;
    role?: string;
    specialty?: string;
    phone?: string;
    email?: string;
    experience?: string;
    rating?: number;
    status?: string;
  };

  if (!name || !role) {
    res.status(400).json({ error: 'name and role are required' });
    return;
  }

  try {
    const member = await Staff.create({
      name,
      role,
      specialty: specialty ?? '',
      phone: phone ?? '',
      email: email ?? '',
      experience: experience ?? '',
      rating: rating ?? 0,
      status: status ?? 'Available',
    });

    res.status(201).json({ staff: member });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateStaff(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const updates = req.body as {
    name?: string;
    role?: string;
    specialty?: string;
    phone?: string;
    email?: string;
    experience?: string;
    rating?: number;
    status?: string;
  };

  try {
    const member = await Staff.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

    if (!member) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    res.json({ staff: member });
  } catch (err) {
    console.error('Update staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteStaff(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  try {
    const member = await Staff.findByIdAndDelete(id);
    if (!member) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }
    res.json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
