// 消息格式
export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
};
