import type { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
  api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
  api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
});

export async function uploadImage(req: Request, res: Response): Promise<void> {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }

  try {
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'hair-booking', resource_type: 'image' },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error('Upload failed'));
          } else {
            resolve({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id });
          }
        }
      );
      stream.end(file.buffer);
    });

    res.status(201).json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
}
