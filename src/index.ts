import app from './server.js';
import { connectMongo } from './config/mongo.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env['PORT'] ?? 3000;

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});