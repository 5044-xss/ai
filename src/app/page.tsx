// app/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/components/chat-message';
import { SendIcon, RotateCcwIcon, SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function SmartAgentPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '请求失败');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
    setError(null);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
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
            <div className="h-[60vh] overflow-y-auto border rounded-lg p-4 mb-4 bg-card">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  输入问题开始对话吧 👋
                </div>
              ) : (
                messages.map((msg, i) => <ChatMessage key={i} {...msg} />)
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground rounded-lg rounded-bl-md px-4 py-2">
                    思考中...
                  </div>
                </div>
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
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? <RotateCcwIcon className="animate-spin" /> : <SendIcon />}
              </Button>
            </form>

            {/* 清空按钮 */}
            {messages.length > 0 && (
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