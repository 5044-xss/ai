// src/app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UploadIcon, RotateCcwIcon } from 'lucide-react';
import { ChatBox, Message } from '@/components/chat-box';
import SearchResults from '@/components/search-results'
import { processStream } from '@/lib/sse-handler'; // 确保你有这个工具函数
interface SearchResult {
  text: string;
  metadata: {
    source: string;      // 原始文档名（如 "用户手册.docx"）
    htmlPath: string;    // 生成的 HTML 路径（如 "/docs/manual.html"）
    startIdx: number;
    paragraphId?: string;
  };
}

export default function SmartAgentPage() {
  // ===== 聊天状态 =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingTextRef = useRef(streamingText);
  const [result, setRsult] = useState<SearchResult[]>([]);

  const accept = '.pdf,.docx'

  // 文件上传
  const [file, setFile] = useState<File | null>(null);

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

    try {
  
      // rag检索 召回文档片段
      const res = await fetch('/api/chat/day8/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });
      const data = await res.json();
      console.log(data, 'rag检索');
      setRsult(data.relevantChunks)
      // 调用你的聊天 API
      const conetent = `这是相关文档，内容为：。问题是：${input} 。现在请回答问题`
      const response = await fetch('/api/chat/day8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { ...userMessage, conetent }] })
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

      setFile(null)
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
      setFile(e.target.files[0]);
    }
  };

  // 在组件中使用ref来重置input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 在删除文件时，也需要清空input的值
  const handleDeleteFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // 清空input的值
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeDocument = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {

      const formData = new FormData();
      formData.append('file', file);

      await fetch('/api/chat/day8/ingest', {
        method: 'POST',
        body: formData,
      });

    } catch (err: any) {
      console.error('文档分析错误:', err);
      setError(err.message || '文档分析失败');
    } finally {
      setIsAnalyzing(false);
    }

  }

  return (
    <div className="space-y-6">
      <div className='max-w-3xl mx-auto'> <SearchResults results={result} /></div>
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
          setFile(null)
        }}
        title="智能文档助手 day8"
        placeholder="例如：公司业务流程是什么？"
        comp={<div className="">
          <Card className="p-3 border rounded-lg bg-card flex items-center gap-2">
            <label className="flex-1 cursor-pointer relative">
              <div className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                {file ? (
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
                <span className={file ? "ml-4" : ""}>
                  {file ? file.name : '选择 PDF 或 Word 文件'}
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
            {file && (
              <Button
                type="button"
                size="sm"
                onClick={analyzeDocument}
                disabled={isLoading}
              >
                {isAnalyzing ? <RotateCcwIcon className="animate-spin" /> : '上传文档'}
              </Button>
            )}
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