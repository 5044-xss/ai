
import {  NextResponse } from 'next/server';
import {
  RunnableSequence,
} from '@langchain/core/runnables';
import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from '@langchain/core/prompts';

export const runtime = 'nodejs';
// 自定义调用模型层
export const customModelCall = async (input: { messages: BaseMessage[] }) => {
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
          console.log(chunk, 'chunk 千问返回数据-------------');
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

};

// 定义一个处理步骤：将输入的消息转换为合适的格式
export const formatMessages = (input: { messages: Array<{ role: string; content: string }> }) => {
  return input

}

// 新增一个步骤：注入系统提示
const injectSystemPrompt = (input: { messages: BaseMessage[] }) => {
  const systemPrompt = "你是一个专业的客服助手，请用中文礼貌回答，并且每次回复我的时候先回复一个微笑";

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

// 创建一个 LangChain 链，使用通用接口
export const createChain = (systemPrompt?: string) => {
  // 动态提示词
  const inject = (input: { messages: BaseMessage[] }) => {
    if (!systemPrompt) return input;
    if (input.messages[0]?.role === 'system') return input;
    return {
      messages: [{ role: 'system', content: systemPrompt }, ...input.messages]
    };
  };
  // 创建提示模板
  const prompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("messages"),
  ]);

  // 创建链 - 这里我们将消息格式化后直接返回，不实际调用模型
  const chain = RunnableSequence.from([
    formatMessages,       // 校验原始输入
    inject,
    injectSystemPrompt,   // 👈 新增：动态加提示词
    (input) => input,     // 透传（或直接合并到 injectSystemPrompt）
    customModelCall
  ]);

  return chain;
};

