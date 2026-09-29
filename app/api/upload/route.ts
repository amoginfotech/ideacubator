import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const applicantUid = (formData.get('applicantUid') as string) || 'anonymous';
    const applicationId = (formData.get('applicationId') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name || 'document.pdf';
    const sanitizedBase = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `applications/${applicationId}/${Date.now()}_${sanitizedBase}`;

    // 1. If Vercel Blob token is available (Production on Vercel), upload permanently to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(pathname, file, {
        access: 'public',
      });

      return NextResponse.json({
        success: true,
        name: originalName,
        size: file.size,
        storagePath: blob.pathname,
        downloadUrl: blob.url,
        uploadedAt: new Date().toISOString()
      });
    }

    // 2. Local development fallback (when testing locally without Vercel Blob token)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}_${sanitizedBase}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    const arrayBuffer = await file.arrayBuffer();
    await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));

    return NextResponse.json({
      success: true,
      name: originalName,
      size: file.size,
      storagePath: `uploads/${uniqueFileName}`,
      downloadUrl: `/api/documents/${uniqueFileName}`,
      uploadedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('File upload error in /api/upload:', error);
    return NextResponse.json(
      { error: error.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
