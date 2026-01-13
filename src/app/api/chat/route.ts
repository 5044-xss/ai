// app/api/chat/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // 推荐：使用 Edge Runtime（更快、更省资源）

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    // 验证输入
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    }

    // 调用 DashScope Qwen API（非流式，兼容性最好）
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-turbo', // 可替换为 qwen-max / qwen-plus
        input: {
          messages: messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
        parameters: {
          result_format: 'message',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DashScope API Error:', response.status, errorText);
      return NextResponse.json({ error: 'AI 服务异常，请稍后重试', e: response }, { status: 500 });
    }

    const data = await response.json();
    const content = data?.output?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: '未收到有效回复' }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}