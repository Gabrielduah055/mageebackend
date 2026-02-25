import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import bookingsRoutes from './routes/bookings.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({ message: 'Magee Hair Booking API', version: '1.0.0' });
});

app.use('/auth', authRoutes);
app.use('/services', servicesRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/upload', uploadRoutes);

export default app;