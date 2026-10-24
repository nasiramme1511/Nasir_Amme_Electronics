import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { jsonSuccess, jsonError } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Only authorized roles (admin & manager) can upload product images
    await requireRole(request, 'admin', 'manager');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new ValidationError('No file provided in form data. Field name must be "file".');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.type)) {
      throw new ValidationError(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WEBP, GIF.`);
    }

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      throw new ValidationError(`File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await fs.mkdir(uploadDir, { recursive: true });

    const rawExt = path.extname(file.name) || '.jpg';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.jpg';
    const uniqueName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${cleanExt}`;
    const destination = path.join(uploadDir, uniqueName);

    await fs.writeFile(destination, buffer);

    const publicUrl = `/uploads/products/${uniqueName}`;

    return jsonSuccess(
      {
        url: publicUrl,
        fileName: uniqueName,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      },
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}
