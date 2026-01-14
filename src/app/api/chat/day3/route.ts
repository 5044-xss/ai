// app/api/chat/day3/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createChain } from './langchain-chunk'
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

    // 创建 LangChain 链
    const chain = createChain('你是一名世界上最厉害的编程专家');

    return await chain.invoke({ messages });

  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}