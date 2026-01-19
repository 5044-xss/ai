
import { RunnableSequence } from '@langchain/core/runnables';
import type { Message } from '@/types/globals'
import { injectSystemPrompt, formatMessages, customModelCall } from './langchain-chunk'

export const runtime = 'nodejs';
export const langchainExample = (systemPrompt?: string) => {
  // 动态提示词
  const inject = (input: { messages: Message[] }) => {
    if (!systemPrompt) return input;
    if (input.messages[0]?.role === 'system') return input;
    return {
      messages: [{ role: 'system', content: systemPrompt }, ...input.messages]
    };
  };

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
