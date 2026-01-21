
import { NextResponse } from 'next/server';
import type { Message } from '@/types/globals'
export const runtime = 'nodejs';
import { retrieveRelevantChunks } from '@/lib/vector/rag-retriever';
import { retrieve } from '@/lib/vector2/retriever'
import { callQwen } from '@/lib/vector/qwen'; // 你之前封装的 Qwen 调用

/* ----------------------- // 第一一个处理步骤：将输入的消息转换为合适的格式 ----------------------- */
export const formatMessages = async (input: { messages: Array<{ role: string; content: string }> }) => {
  

  //   // 1. 检索相关上下文
  // const relevantChunks = await retrieve(input.messages?.[0].content, 3);
  // const context = relevantChunks.map(c => c.text).join('\n\n');
  // console.log(context, 'context', input.messages?.[0].content);
  //   // 2. 构造 Prompt
  //   const systemPrompt = `你是一个智能文档助手，请严格基于以下文档内容回答问题。
  //     如果文档中没有相关信息，请回答：“根据提供的文档，无法回答该问题。”
  //     文档内容：
  //     ${context}`;

  // return {
  //   messages: input.messages.concat({ role: 'system' as const, content: systemPrompt }),
  // }

  return input

}

/* ---------------------------- // 第二个处理步骤：注入系统提示 --------------------------- */
export const injectSystemPrompt = (input: { messages: Message[] }) => {
  const systemPrompt = "请用中文礼貌回答，并且每次回复我的时候先回复一个微笑";

  // 如果第一条不是 system，则前置插入
  if (input.messages.length === 0 || input.messages[0].role !== 'system') {
    return {
      messages: [
        { role: 'system', content: systemPrompt },
        ...input.messages
      ]
    };
  }

  return input; // 已有 system，不重复加
};

/* --------------------------- // 最后一个步骤： 自定义调用模型层 -------------------------- */
export const customModelCall = async (input: { messages: Message[] }) => {
  /* ---------------------------------- 请求模型 ---------------------------------- */
  const body = JSON.stringify({
    model: 'qwen-max',
    // model: 'qwen-turbo',
    input,
    parameters: {
      result_format: 'message', stream: true, // 启用流式响应
    },
  })

  console.log(body, '调用千问入参 body--------------', input);

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
      body,
    }
  );
  callQwen

  if (!dashResponse.ok || !dashResponse.body) {
    return new NextResponse('DashScope API Error', { status: 500 });
  }

  /* ---------------- // 创建 ReadableStream 来处理并转换 DashScope 的响应 --------------- */
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
                  // 如果是完整消息，则发送内容（包括结束消息）
                  else if (choice.message?.content) {
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

};