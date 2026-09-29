import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const applicantUid = (formData.get('applicantUid') as string) || 'anonymous';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Sanitize filename and create unique name
    const originalName = file.name || 'document.pdf';
    const sanitizedBase = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${sanitizedBase}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Write file buffer to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(filePath, buffer);

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
