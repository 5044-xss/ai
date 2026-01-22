// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 检查环境变量是否生效
console.log('✅ TRANSFORMERS_JS_SKIP_IMAGE:', process.env.TRANSFORMERS_JS_SKIP_IMAGE);


// 确保在导入前设置（双重保险）
if (!process.env.TRANSFORMERS_JS_SKIP_IMAGE) {
  process.env.TRANSFORMERS_JS_SKIP_IMAGE = 'true';
}

import { parseDocument, saveChunksToVectorStore } from './ingest-doc'
import { chunkTextWithMetadata } from './chunk'


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未找到上传的文件' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { text, html, sourse } = await parseDocument(buffer, file.name);
    console.log(text,'rse--------------');
    
    const chunks = chunkTextWithMetadata(text, sourse, html);
    console.log(chunks,'chunks');

    // 构建本地向量库
    // await ingestDocument(file.name, chunks);
    await saveChunksToVectorStore(chunks);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Ingest error:', error);
    return Response.json({ error: '文档处理失败' }, { status: 500 });
  }
}

