// src/components/chat-box.tsx
'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/components/chat-message';
import { SendIcon, RotateCcwIcon } from 'lucide-react';

/**
 * 消息类型
 */
export type Message = {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
};

/**
 * ChatBox Props（仅聊天相关）
 */
export type ChatBoxProps = {
  // 状态（受控）
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingText: string;
  isStreaming: boolean;

  // 回调
  onSendMessage: (input: string) => void;
  onClear: () => void;

  // 配置
  title?: string;
  placeholder?: string;
  comp?: React.ReactNode;
};

/**
 * 纯聊天组件 —— 不含文件上传、不含主题切换
 */
export function ChatBox({
  messages,
  isLoading,
  error,
  streamingText,
  isStreaming,
  onSendMessage,
  onClear,
  comp,
  title = '智能问答助手',
  placeholder = '输入问题...'
 
}: ChatBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current?.value.trim();
    if (!input || isLoading) return;

    onSendMessage(input);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="border-none shadow-none">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">🧠 {title}</CardTitle>
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
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id || msg.content} {...msg} />
                  ))}

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
            {comp && <div className="p-3 p-1 flex justify-start gap-2">{comp} </div>}
            {/* 输入框 */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading}
              >
                {isLoading ? <RotateCcwIcon className="animate-spin" /> : <SendIcon />}
              </Button>
            </form>
         
           
            {(messages.length > 0 || isStreaming) && (
              <div className="flex justify-end mt-3">
                <Button variant="ghost" size="sm" onClick={onClear}>
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