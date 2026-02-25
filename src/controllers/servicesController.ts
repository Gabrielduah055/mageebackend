import type { Request, Response } from 'express';
import { Service } from '../models/service.js';

export async function createService(req: Request, res: Response): Promise<void> {
  const { name, description, price, duration_minutes } = req.body as {
    name?: string;
    description?: string;
    price?: number;
    duration_minutes?: number;
  };

  if (!name || price === undefined || !duration_minutes) {
    res.status(400).json({ error: 'name, price, and duration_minutes are required' });
    return;
  }

  if (isNaN(Number(price)) || Number(price) < 0) {
    res.status(400).json({ error: 'price must be a non-negative number' });
    return;
  }

  if (!Number.isInteger(Number(duration_minutes)) || Number(duration_minutes) < 1) {
    res.status(400).json({ error: 'duration_minutes must be a positive integer' });
    return;
  }

  try {
    const service = await Service.create({
      name,
      description: description ?? undefined,
      price: Number(price),
      duration_minutes: Number(duration_minutes),
    });

    res.status(201).json({ service });
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getServices(_req: Request, res: Response): Promise<void> {
  try {
    const services = await Service.find().sort({ created_at: 1 });
    res.json({ services });
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
