// app/api/chat/stream/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages)) {
      return new Response('Invalid request', { status: 400 });
    }

    // 调用 DashScope API（非流式），然后模拟流式响应
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
        parameters: {
          result_format: 'message',
        },
        "stream": true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DashScope API Error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `API Error: ${errorText}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const fullContent = data?.output?.choices?.[0]?.message?.content;

    if (!fullContent) {
      return new Response(JSON.stringify({ error: '未收到有效回复' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 创建一个 ReadableStream 来模拟流式响应
    const stream = new ReadableStream({
      start(controller) {
        // 模拟逐字发送效果
        let index = 0;
        const sendChunk = () => {
          if (index < fullContent.length) {
            // 发送单个字符
            const char = fullContent[index];
            const sseData = `data: ${JSON.stringify({ content: char })}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseData));
            index++;

            // 使用 setTimeout 模拟流式发送效果
            setTimeout(sendChunk, 50); // 每50毫秒发送一个字符
          } else {
            // 发送结束信号
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        };

        sendChunk();
      },
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
