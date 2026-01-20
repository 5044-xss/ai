// src/lib/qwen.ts
if (!process.env.DASHSCOPE_API_KEY) {
  throw new Error('请在 .env.local 中设置 DASHSCOPE_API_KEY');
}

const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export async function callQwen(messages: Message[]) {
  try {
    // DashScope 要求 messages 必须以 user 开头
    const dashMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch(DASHSCOPE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-max', // 或 qwen-plus, qwen-turbo
        input: {
          messages: dashMessages,
        },
        parameters: {
          result_format: 'message',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DashScope API 错误: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('Qwen 调用失败:', error);
    throw error;
  }
}