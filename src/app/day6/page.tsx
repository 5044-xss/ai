// src/app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { UploadIcon } from 'lucide-react';
import { ChatBox, Message } from '@/components/chat-box';
import { processStream } from '@/lib/sse-handler'; // 确保你有这个工具函数
export default function SmartAgentPage() {
  // ===== 聊天状态 =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingTextRef = useRef(streamingText);

  // const accept = '.pdf,.docx,.jpg,.png'
  const accept = 'image/*'

  // 文件上传
  const [image, setImage] = useState<File | null>(null);

  // 同步 ref
  useEffect(() => {
    streamingTextRef.current = streamingText;
  }, [streamingText]);

  // 文件转成base64
  async function fileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // ===== 核心：发送聊天消息 =====
  const handleSendMessage = async (input: string) => {
    setError(null);
    const userMessage: Message = { role: 'user', content: input, id: Date.now().toString() };
    setMessages(prev => [...prev, { role: 'user', content: input, id: Date.now().toString() }]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');


    // 1. 转 base64
    const base64Image = image? await fileToBase64(image as File):null
    const mimeType = image?.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    const userFileMessage: Message = {
      role: 'user',
      content: [
        { image: dataUrl },
        { text: input }
      ] as any,
      id: Date.now().toString()
    };
   

    try {
      // 调用你的聊天 API
      const apiUrl = image? '/api/chat/day6/analyze-image' : '/api/chat/day6';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, image ? userFileMessage: userMessage] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI 服务请求失败');
      }
      // 处理 SSE 流式响应
      await processStream(
        response,
        (chunk: string) => {
          setStreamingText(prev => chunk); // 注意：这里是追加！
        },
        () => {
          // 流结束，保存完整消息
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: streamingTextRef.current,
              id: Date.now().toString()
            }
          ]);
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingText('');
        },
        (err: Error) => {
          console.error('SSE Error:', err);
          setError(err.message || '消息流中断');
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingText('');
        }
      );

      setImage(null)
    } catch (err: any) {
      console.error('Fetch Error:', err);
      setError(err.message || '网络错误，请重试');
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingText('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  };

  // 在组件中使用ref来重置input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 在删除文件时，也需要清空input的值
  const handleDeleteFile = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // 清空input的值
    }
  };

  return (
    <div className="space-y-6">
      {/* 聊天组件 */}
      <ChatBox
        messages={messages}
        isLoading={isLoading}
        error={null} // 错误已在上方显示，避免重复
        streamingText={streamingText}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onClear={() => {
          setMessages([]);
          setStreamingText('');
          setIsStreaming(false);
          setError(null);
          setImage(null)
        }}
        title="智能问答助手 day6"
        placeholder="例如：公司业务流程是什么？"
        comp={<div className="">
          <Card className="p-3 border rounded-lg bg-card flex items-center gap-2">
            <label className="flex-1 cursor-pointer relative">
              <div className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                {image ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault(); // 阻止默认行为
                      e.stopPropagation(); // 阻止事件冒泡
                      handleDeleteFile(); // 使用新的删除函数
                    }}
                    className="h-4 w-4 mr-2 text-gray-500 hover:text-red-500 transition-colors absolute left-0 top-1/2 transform -translate-y-1/2"
                    aria-label="删除文件"
                  >
                    ✕
                  </button>
                ) : (
                  <UploadIcon className="h-4 w-4 mr-2" />
                )}
                <span className={image ? "ml-4" : ""}>
                  {image ? image.name : '选择图片文件'}
                </span>
              </div>
              <input
                ref={fileInputRef} // 添加ref
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </Card>
          {error && (
            <div className="text-red-500 text-sm mt-2 max-w-3xl mx-auto px-4">
              {error}
            </div>
          )}
        </div>}
      />

    </div>
  );
}