// src/app/api/ingest/route.ts
import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { ingestDocx } from './ingest';

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file = data.get('file') as File;

  if (!file || file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return Response.json({ error: '请上传 .docx 文件' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = join(process.cwd(), 'uploads', Date.now() + '_' + file.name);
  await writeFile(filePath, buffer);

  await ingestDocx(filePath);

  return Response.json({ success: true });
}