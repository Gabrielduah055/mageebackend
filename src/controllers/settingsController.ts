import type { Request, Response } from 'express';
import { Settings } from '../models/settings.js';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const { salonName, ownerName, email, phone, address, openTime, closeTime, logoUrl } = req.body as {
    salonName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    openTime?: string;
    closeTime?: string;
    logoUrl?: string;
  };

  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        salonName, ownerName, email, phone, address, openTime, closeTime, logoUrl,
      });
    } else {
      if (salonName !== undefined) settings.salonName = salonName;
      if (ownerName !== undefined) settings.ownerName = ownerName;
      if (email !== undefined) settings.email = email;
      if (phone !== undefined) settings.phone = phone;
      if (address !== undefined) settings.address = address;
      if (openTime !== undefined) settings.openTime = openTime;
      if (closeTime !== undefined) settings.closeTime = closeTime;
      if (logoUrl !== undefined) settings.logoUrl = logoUrl;
      await settings.save();
    }

    res.json({ settings });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
