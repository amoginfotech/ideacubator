import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain'
};

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    // Security check to avoid directory traversal
    const safeFilename = path.basename(filename);
    const localFilePath = path.join(process.cwd(), 'uploads', safeFilename);
    const tmpFilePath = path.join(os.tmpdir(), 'ideacubator-uploads', safeFilename);

    let fileBuffer: Buffer | null = null;
    if (fs.existsSync(localFilePath)) {
      fileBuffer = await fs.promises.readFile(localFilePath);
    } else if (fs.existsSync(tmpFilePath)) {
      fileBuffer = await fs.promises.readFile(tmpFilePath);
    } else {
      // Fetch from Vercel Blob
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "vercel_blob_rw_4BerJx4GSuYGbBAE_4I9U1w4rjVJygddvxwDQQqzWqYzCIA";
      const storeId = process.env.BLOB_STORE_ID || "store_4BerJx4GSuYGbBAE";
      const cleanStoreId = storeId.replace('store_', '').toLowerCase();

      const blobUrlsToTry = [
        `https://${cleanStoreId}.private.blob.vercel-storage.com/documents/${safeFilename}`,
        `https://${cleanStoreId}.public.blob.vercel-storage.com/documents/${safeFilename}`,
      ];

      for (const url of blobUrlsToTry) {
        try {
          const res = await fetch(url, {
            headers: blobToken ? { Authorization: `Bearer ${blobToken}` } : {}
          });
          if (res.ok) {
            const ab = await res.arrayBuffer();
            fileBuffer = Buffer.from(ab);
            break;
          }
        } catch {
          // continue
        }
      }

      if (!fileBuffer) {
        return new NextResponse('File Not Found', { status: 404 });
      }
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error: any) {
    console.error('Error serving document:', error);
    return new NextResponse('Error reading file', { status: 500 });
  }
}
