import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

function getUploadsDir(): string {
  // First try cwd/uploads (local dev)
  const localDir = path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Verify write permissions
    const testFile = path.join(localDir, `.test_write_${Date.now()}`);
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    // If process.cwd() is read-only (e.g. AWS Lambda / Vercel Serverless), use os.tmpdir()
    const tmpDir = path.join(os.tmpdir(), 'ideacubator-uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData: any = await req.formData();
    const file = formData.get('file') as any;
    const applicantUid = (formData.get('applicantUid') as string) || 'anonymous';
    const applicationId = (formData.get('applicationId') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name || 'document.pdf';
    const sanitizedBase = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${sanitizedBase}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "vercel_blob_rw_4BerJx4GSuYGbBAE_4I9U1w4rjVJygddvxwDQQqzWqYzCIA";
    let blobStoragePath = `uploads/${uniqueFileName}`;

    // 1. Upload permanently to Vercel Blob (Private Store BOM1)
    if (blobToken) {
      try {
        const pathname = `documents/${uniqueFileName}`;
        let blob: any;
        try {
          blob = await put(pathname, fileBuffer, {
            access: 'private',
            token: blobToken,
            contentType: file.type || 'application/octet-stream',
          });
        } catch (privErr: any) {
          if (privErr?.message?.includes('Cannot use private access on a public store')) {
            blob = await put(pathname, fileBuffer, {
              access: 'public',
              token: blobToken,
              contentType: file.type || 'application/octet-stream',
            });
          } else {
            throw privErr;
          }
        }

        if (blob?.pathname) {
          blobStoragePath = blob.pathname;
        }
      } catch (blobErr: any) {
        console.warn('Vercel Blob upload notice, falling back to disk/temp storage:', blobErr?.message || blobErr);
      }
    }

    // 2. Also persist to local/temp disk
    try {
      const uploadsDir = getUploadsDir();
      const filePath = path.join(uploadsDir, uniqueFileName);
      await fs.promises.writeFile(filePath, fileBuffer);
    } catch (diskErr) {
      console.warn('Local disk backup notice:', diskErr);
    }

    return NextResponse.json({
      success: true,
      name: originalName,
      size: file.size,
      storagePath: blobStoragePath,
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
