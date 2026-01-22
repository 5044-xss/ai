// app/api/chat/day3/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { retrieve } from './retriever'
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    // 校验输入格式
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // 验证 API Key
    if (!process.env.QWEN_API_KEY) {
      return NextResponse.json({ error: "QWEN_API_KEY is not set" }, { status: 500 });
    }

    // 1. 检索相关上下文
    const relevantChunks = await retrieve(messages?.[messages.length - 1].content, 2);
    const context = relevantChunks.map(c => c.text).join('\n\n');

    if (context) {
      return await NextResponse.json({ content: context, relevantChunks });
    } else {
      return new NextResponse('Internal Server Error', { status: 500 });
    }


  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}