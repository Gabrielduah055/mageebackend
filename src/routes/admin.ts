import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import {
  getDashboardStats,
  getAdminBookings,
  updateAdminBookingStatus,
  getClients,
  getClientById,
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
} from '../controllers/adminController.js';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../controllers/staffController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = Router();

// Public route — client landing page reads salon info without auth
router.get('/settings/public', getSettings);

router.use(authenticate, adminOnly);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Bookings
router.get('/bookings', getAdminBookings);
router.patch('/bookings/:id', updateAdminBookingStatus);

// Clients
router.get('/clients', getClients);
router.get('/clients/:id', getClientById);

// Services
router.get('/services', getAdminServices);
router.post('/services', createAdminService);
router.put('/services/:id', updateAdminService);
router.delete('/services/:id', deleteAdminService);

// Staff
router.get('/staff', getStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
