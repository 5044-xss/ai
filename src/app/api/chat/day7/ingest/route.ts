// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 检查环境变量是否生效
console.log('✅ TRANSFORMERS_JS_SKIP_IMAGE:', process.env.TRANSFORMERS_JS_SKIP_IMAGE);


// 确保在导入前设置（双重保险）
if (!process.env.TRANSFORMERS_JS_SKIP_IMAGE) {
  process.env.TRANSFORMERS_JS_SKIP_IMAGE = 'true';
}
import { parseDocument } from '@/lib/document-analyzer'; // 你已实现
import { ingestDocument } from '@/lib/vector/vector-store';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未找到上传的文件' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const documentText = await parseDocument(buffer, file.name);

    // 构建本地向量库
    await ingestDocument(file.name, documentText);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Ingest error:', error);
    return Response.json({ error: '文档处理失败' }, { status: 500 });
  }
}