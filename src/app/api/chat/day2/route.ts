// app/api/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // 调用 DashScope API，启用流式响应
    const dashResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
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
            stream: true, // 启用流式响应
          },
        }),
      }
    );

    if (!dashResponse.ok || !dashResponse.body) {
      return new NextResponse('DashScope API Error', { status: 500 });
    }

    // 创建 ReadableStream 来处理并转换 DashScope 的响应
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = dashResponse.body!.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // 发送完成信号
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }

            // 解码接收到的数据块
            const chunk = decoder.decode(value, { stream: true });

            // 按行处理
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  // 解析数据行
                  const jsonData = line.substring(5).trim(); // 移除 "data:" 前缀

                  if (jsonData === '[DONE]') {
                    continue; // 跳过 [DONE] 标记
                  }

                  const parsed = JSON?.parse(jsonData);

                  // 检查是否是完整消息（非流式）或增量消息（流式）
                  if (parsed.output?.choices?.[0]) {
                    const choice = parsed.output.choices[0];

                    // 优先处理增量内容（流式）
                    if (choice.delta?.content) {
                      // 发送增量内容
                      const sseData = `data: ${JSON.stringify({ content: choice.delta.content })}\n\n`;
                      controller.enqueue(encoder.encode(sseData));
                    }
                    // 如果是完整消息且不是停止标志，则也需要处理
                    else if (choice.message?.content && choice.finish_reason !== 'stop') {
                      const sseData = `data: ${JSON.stringify({ content: choice.message.content })}\n\n`;
                      controller.enqueue(encoder.encode(sseData));
                    }
                  }
                } catch (e) {
                  console.error('Error parsing line:', line, e);
                  // 忽略无法解析的行
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}