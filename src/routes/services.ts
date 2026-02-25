import { Router } from 'express';
import { createService, getServices } from '../controllers/servicesController.js';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';

const router = Router();

router.post('/', authenticate, adminOnly, createService);
router.get('/', getServices);

export default router;
