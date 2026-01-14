// app/page.tsx
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button"

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Day1Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // 清除上一次的错误
    setError(null);

    // 添加用户消息
    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });




      console.log(res, 'res');

      const data = await res.json();
      console.log(data, 'data');


      if (!res.ok) {
        throw new Error(data.error || '请求失败');
      }

      // 添加 AI 回复
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err: any) {
      console.error('Chat Error:', err);
      setError(err.message || '网络错误');
      // 移除最后一条用户消息（可选）
      // setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-800">🧠 智能体问答 day1</h1>
          <p className="text-gray-600 mt-2">基于通义千问（Qwen）的 AI 助手</p>
        </header>

        {/* 控制栏 */}
        <div className="flex justify-between mb-4">
          <Button
            onClick={handleClear}
            disabled={messages.length === 0}

          >
            清空对话
          </Button>
          {error && <span className="text-red-500 text-sm">{error}</span>}
        </div>

        {/* 聊天区域 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[60vh] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              输入问题开始对话吧 👋
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-2">
                思考中...
              </div>
            </div>
          )}
        </div>

        {/* 输入框 */}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：React 19 有哪些新特性？"
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white rounded-full w-12 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
          >
            ↵
          </Button>
        </form>

        <footer className="text-center text-xs text-gray-500 mt-8">
          © {new Date().getFullYear()} 智能体问答系统
        </footer>
      </div>
    </div>
  );
}