// app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/components/chat-message';
import { SendIcon, RotateCcwIcon, SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { processStream } from '@/lib/sse-handler';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
};

export default function SmartAgentPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingTextRef = useRef(streamingText);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 同步 streamingTextRef 的值
  useEffect(() => {
    streamingTextRef.current = streamingText;
  }, [streamingText]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;  // 添加 isLoading 检查防止重复提交

    setError(null);
    const userMessage: Message = { role: 'user', content: input, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');

    try {
      // 使用流式API
      const response = await fetch('/api/chat/day2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      // 使用SSE处理函数
      await processStream(
        response,
        // onChunk - 每次接收到数据块时更新流式文本
        (chunk: string) => {
          setStreamingText(prev => chunk);
        },
        // onComplete - 流完成时将完整消息添加到消息列表
        () => {
          // 仅当 streamingText 有内容时才添加到消息列表
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: streamingTextRef.current, id: Date.now().toString() }
          ]);
          // 重置状态
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingText('');
        },
        // onError - 错误处理
        (error: Error) => {
          console.error('Stream error:', error);
          setError(error.message || '流式响应出错');
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingText('');
        }
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || '网络错误');
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingText('');
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
    setError(null);
    setStreamingText('');
    setIsStreaming(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="border-none shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">🧠 智能问答助手</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              基于通义千问（Qwen）的 AI 对话系统
            </p>
          </CardHeader>
          <CardContent>
            {/* 聊天区域 */}
            <div className="h-[50vh] overflow-y-auto border rounded-lg p-4 mb-4 bg-card">
              {messages.length === 0 && !isStreaming ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  输入问题开始对话吧 👋
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <ChatMessage key={msg.id || i} {...msg} />
                  ))}

                  {/* 流式响应显示区域 */}
                  {isStreaming && streamingText && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-muted-foreground rounded-lg rounded-bl-md px-4 py-2 max-w-[80%]">
                        <div className="flex items-center">
                          <span> 🤖</span>
                          <span>{streamingText}</span>
                          <span className="ml-1 animate-pulse">|</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 加载状态 */}
                  {isLoading && !isStreaming && !streamingText && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-muted-foreground rounded-lg rounded-bl-md px-4 py-2">
                        思考中...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}

              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </div>

            {/* 输入框 */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：React 19 有哪些新特性？"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <RotateCcwIcon className="animate-spin" /> : <SendIcon />}
              </Button>
            </form>

            {/* 清空按钮 */}
            {(messages.length > 0 || isStreaming) && (
              <div className="flex justify-between items-center mt-3">
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  清空对话
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}