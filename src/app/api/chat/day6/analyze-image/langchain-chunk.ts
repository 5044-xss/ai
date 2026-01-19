
import { NextResponse } from 'next/server';
import type { Message } from '@/types/globals'
export const runtime = 'nodejs';
import { QWEN_MULTIMODAL_API_CONST, QWEN_VL_PLUS_CONST ,QWEN_VL_MAX_CONST} from '@/const/qwen_mode.const'
import { transReadStream } from '@/lib/trans-read_stream'

/* ----------------------- // 第一一个处理步骤：将输入的消息转换为合适的格式 ----------------------- */
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
export const formatMessages = (input: { messages: Array<{ role: string; content: string }> }) => {
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
    model: QWEN_VL_MAX_CONST,
    input,
    parameters: { result_format: 'message', stream: true, } // 启用流式响应}
  })

  console.log(body, '调用千问入参 body--------------', input);

  // 调用 DashScope API，启用流式响应
  const dashResponse = await fetch(QWEN_MULTIMODAL_API_CONST,
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
  const stream = transReadStream(dashResponse)

  // 返回流式响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });

};