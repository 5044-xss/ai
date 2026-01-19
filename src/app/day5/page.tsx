// app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/components/chat-message';
import { SendIcon, RotateCcwIcon, SunIcon, MoonIcon, UploadIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { processStream } from '@/lib/sse-handler';

/**
 * 消息类型定义
 * @property {string} role - 消息角色 ('user' | 'assistant')
 * @property {string} content - 消息内容
 * @property {string} [id] - 消息唯一ID
 */
type Message = {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
};

type DocumentAnalysis = {
  totalWords: number;
  uniqueWords: number;
  keywords: { word: string; count: number }[];
  summary: string;
};

/**
 * 智能问答助手页面组件
 * 
 * 功能特点：
 * - 支持用户与AI助手的对话交互
 * - 实现流式响应显示，模拟打字机效果
 * - 提供主题切换功能（明暗模式）
 * - 集成错误处理和加载状态管理
 * - 支持文档上传与分析功能
 */
export default function SmartAgentPage() {
  // 状态管理
  const [input, setInput] = useState('');                                    // 用户输入
  const [messages, setMessages] = useState<Message[]>([]);                   // 消息列表
  const [isLoading, setIsLoading] = useState(false);                         // 加载状态
  const [error, setError] = useState<string | null>(null);                   // 错误信息
  const [streamingText, setStreamingText] = useState('');                    // 流式响应文本
  const [isStreaming, setIsStreaming] = useState(false);                     // 流式响应状态
  const [file, setFile] = useState<File | null>(null);                       // 上传的文件
  const [isAnalyzing, setIsAnalyzing] = useState(false);                     // 文档分析状态

  // 引用管理
  const streamingTextRef = useRef(streamingText);                            // 当前流式文本引用
  const messagesEndRef = useRef<HTMLDivElement>(null);                       // 消息列表底部引用

  // 主题管理
  const { theme, setTheme } = useTheme();

  /**
   * 同步 streamingTextRef 的值
   * 确保在回调函数中能访问到最新的 streamingText 值
   */
  useEffect(() => {
    streamingTextRef.current = streamingText;
  }, [streamingText]);

  /**
   * 滚动到消息列表底部
   * 在消息更新或流式响应变化时自动滚动
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);


  const fetchModel = async () => {
    // 重置错误状态并添加用户消息
    setError(null);
    const userMessage: Message = { role: 'user', content: input, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMessage]);

    // 重置输入框并设置加载状态
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');
    try {
      // 准备请求数据
      const body = JSON.stringify({ messages: [...messages, userMessage] });
      console.log(body, '请求数据', messages);

      // 发起API请求
      const response = await fetch('/api/chat/day5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      // 使用SSE处理函数处理流式响应
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
            {
              role: 'assistant',
              content: streamingTextRef.current,
              id: Date.now().toString()
            }
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
      console.error('请求错误:', err);
      setError(err.message || '网络错误');
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingText('');
    }
    
  }

  /**
   * 处理文件选择
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // 检查文件类型
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.pdf') || selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile);
      } else {
        setError('仅支持 PDF 和 Word (.docx) 文件格式');
      }
    }
  };

  /**
   * 分析上传的文档
   */
  const analyzeDocument = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/action/document-analyzer', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '文档分析失败');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '文档分析失败');
      }

    
      

      // 创建分析结果消息
      const analysisResult: DocumentAnalysis = result.analysis;
      const analysisMessage = `文档分析结果 (${result.filename}):\n\n` +
        `总字数: ${analysisResult.totalWords}\n` +
        `不重复词汇数: ${analysisResult.uniqueWords}\n\n` +
        `关键词列表:\n` +
        analysisResult.keywords.map(kw => `- ${kw.word}: ${kw.count} 次`).join('\n') + '\n\n' +
        `摘要: ${analysisResult.summary}`;
      // 添加分析结果到消息列表
      setMessages(prev => [...prev, { role: 'assistant', content: analysisMessage, id: Date.now().toString() }]);
      setFile(null);
      // fetchModel(message)
     
    } catch (err: any) {
      console.error('文档分析错误:', err);
      setError(err.message || '文档分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };



  /**
   * 处理表单提交事件
   * 发送用户输入到AI助手并处理响应
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 输入验证和防重复提交
    if ((!input.trim() && !file) || isLoading) return;

    // 如果有文件，先分析文件
    if (file && !input.trim()) {
      await analyzeDocument();
      return;
    }

    fetchModel()
  };

  /**
   * 清空对话历史
   * 重置所有状态和输入框
   */
  const handleClear = () => {
    setMessages([]);
    setInput('');
    setFile(null);
    setError(null);
    setStreamingText('');
    setIsStreaming(false);
  };

  /**
   * 切换主题（明暗模式）
   */
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="border-none shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">🧠 智能问答助手 Day5</CardTitle>
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

            {/* 文件上传区域 */}
            <div className="mb-4 p-3 border rounded-lg bg-card flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                  <UploadIcon className="h-4 w-4 mr-2" />
                  {file ? file.name : '选择 PDF 或 Word 文件'}
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading || isAnalyzing}
                />
              </label>
              
              {file && (
                <Button
                  type="button"
                  size="sm"
                  onClick={analyzeDocument}
                  disabled={isLoading || isAnalyzing}
                >
                  {isAnalyzing ? <RotateCcwIcon className="animate-spin" /> : '分析文档'}
                </Button>
              )}
            </div>


            {/* 输入框 */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：React 19 有哪些新特性？"
                disabled={isLoading || isAnalyzing}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || isAnalyzing || (!input.trim() && !file)}
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