'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/components/chat-message';
import {  RotateCcwIcon, SunIcon, MoonIcon, StarIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { processStream } from '@/lib/sse-handler';
import { RatingDisplay ,type RatingDetail} from './RatingDisplay'

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


/**
 * 面试状态枚举
 */
type InterviewStatus = 'idle' | 'selecting' | 'started' | 'completed';


/**
 * 技术面试模拟器页面组件
 * 
 * 功能特点：
 * - 支持选择前端或全栈岗位
 * - AI提供面试题目
 * - AI进行评分和提供改进建议
 * - 保持对话上下文
 */
export default function InterviewSimulator() {
  // 状态管理
  const [position, setPosition] = useState<'frontend' | 'fullstack' | null>(null); // 选择的岗位
  const [status, setStatus] = useState<InterviewStatus>('idle');                 // 面试状态
  const [messages, setMessages] = useState<Array<Message & { rating?: RatingDetail }>>([]); // 消息列表
  const [input, setInput] = useState('');                                       // 用户回答
  const [isLoading, setIsLoading] = useState(false);                            // 加载状态
  const [error, setError] = useState<string | null>(null);                      // 错误信息
  const [streamingText, setStreamingText] = useState('');                       // 流式响应文本
  const [isStreaming, setIsStreaming] = useState(false);                        // 流式响应状态

  // 引用管理
  const streamingTextRef = useRef(streamingText);                               // 当前流式文本引用
  const messagesEndRef = useRef<HTMLDivElement>(null);                          // 消息列表底部引用

  // 主题管理
  const { theme, setTheme } = useTheme();

  // 同步 streamingTextRef 的值
  useEffect(() => {
    streamingTextRef.current = streamingText;
  }, [streamingText]);

  // 滚动到消息列表底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  /**
   * 从AI响应中提取评分信息
   */
  const extractRatingFromResponse = (response: string): RatingDetail | null => {
    // 简单的评分信息提取逻辑，可以根据需要调整正则表达式
    const scoreMatch = response.match(/评分[:：]\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)/i) ||
      response.match(/(\d+(?:\.\d+)?)\s*分(?:满分\s*(\d+))?/i) ||
      response.match(/得分[:：]\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)/i);

    if (scoreMatch) {
      const score = parseFloat(scoreMatch[1]);
      const maxScore = scoreMatch[2] ? parseInt(scoreMatch[2], 10) : 10;

      // 提取反馈信息
      const feedbackMatch = response.match(/反馈[:：]\s*([^。]+)/i) ||
        response.match(/评价[:：]\s*([^。]+)/i);
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : '回答整体不错，但有一些细节需要注意。';

      // 提取改进建议
      const suggestions: string[] = [];
      const suggestionMatches = response.match(/(?:建议|改进)[^：]*：\s*([^。]+)/gi);
      if (suggestionMatches) {
        suggestionMatches.forEach(match => {
          const suggestion = match.replace(/^(?:建议|改进)[^：]*：\s*/, '').trim();
          if (suggestion) suggestions.push(suggestion);
        });
      }

      return {
        score,
        maxScore,
        feedback,
        suggestions
      };
    }

    // 如果没有找到明确的评分格式，返回null
    return null;
  };

  /**
   * 开始面试
   * 向AI发送初始请求以获取第一个面试问题
   */
  const startInterview = async () => {
    if (!position) {
      setError('请选择岗位类型');
      return;
    }

    setError(null);
    setStatus('started');

    // 创建初始消息
    const initialMessage: Message = {
      role: 'user',
      content: `请作为${position === 'frontend' ? '前端' : '全栈'}开发面试官，为我出一道面试题。`,
      id: Date.now().toString()
    };

    setMessages([initialMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');

    try {
      // 准备请求数据
      const body = JSON.stringify({
        messages: [initialMessage]
      });

      // 发起API请求
      const response = await fetch('/api/chat/day4', {
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
          // 将AI的回答添加到消息列表
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
  };

  /**
   * 提交用户答案
   * 将用户的回答发送给AI进行评分和反馈
   */
  const submitAnswer = async () => {
    if (!input.trim() || isLoading) return;

    setError(null);

    // 添加用户输入的消息到界面（不包含评分请求）
    const userMessage: Message = {
      role: 'user',
      content: input,
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');

    try {
      // 准备请求数据 - 包含完整的对话历史，并在最后加上评分请求
      const messagesWithRatingRequest = [
        ...messages,
        userMessage,
        { role: 'user', content: '请对我的回答进行评分（1-10分）并提供具体的改进建议。', id: Date.now().toString() }
      ];

      const body = JSON.stringify({
        messages: messagesWithRatingRequest
      });

      // 发起API请求
      const response = await fetch('/api/chat/day4', {
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
          // 直接更新ref，确保在回调中能够访问到最新的值
          streamingTextRef.current = chunk;
          setStreamingText(prev => chunk);
        },
        // onComplete - 流完成时将完整消息添加到消息列表
        () => {
          // 将AI的反馈添加到消息列表
          const fullResponse = streamingTextRef.current;

          // 尝试从响应中提取评分信息
          const rating = extractRatingFromResponse(fullResponse);

          const newMessage: (Message & { rating?: RatingDetail }) = {
            role: 'assistant',
            content: fullResponse,
            id: Date.now().toString(),
            rating: rating || undefined  // 只有当rating存在时才添加
          };

          setMessages(prev => [...prev, newMessage]);

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
  };

  /**
   * 开始新一轮面试
   * 重置所有状态并开始新的面试
   */
  const startNewInterview = () => {
    setMessages([]);
    setPosition(null);
    setStatus('idle');
    setInput('');
    setError(null);
    setStreamingText('');
    setIsStreaming(false);
  };

  /**
   * 请求下一道题
   * 向AI询问下一道面试题
   */
  const requestNextQuestion = async () => {
    if (isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: '请出下一道面试题',
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');

    try {
      // 准备请求数据 - 包含完整的对话历史
      const body = JSON.stringify({
        messages: [...messages, userMessage]
      });

      // 发起API请求
      const response = await fetch('/api/chat/day4', {
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
          streamingTextRef.current = chunk;
          setStreamingText(prev => chunk);
        },
        // onComplete - 流完成时将完整消息添加到消息列表
        () => {
          // 将AI的反馈添加到消息列表
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
              <CardTitle className="text-2xl font-bold">👨‍💻 技术面试模拟器</CardTitle>
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
              选择岗位类型，开始模拟面试，获得AI评分和改进建议
            </p>
          </CardHeader>
          <CardContent>
            {/* 面试状态控制区域 */}
            {status === 'idle' && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">选择面试岗位</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="frontend"
                      name="position"
                      checked={position === 'frontend'}
                      onChange={() => setPosition('frontend')}
                      className="h-4 w-4 mr-2"
                    />
                    <label htmlFor="frontend" className="text-sm font-medium">
                      前端开发
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="fullstack"
                      name="position"
                      checked={position === 'fullstack'}
                      onChange={() => setPosition('fullstack')}
                      className="h-4 w-4 mr-2"
                    />
                    <label htmlFor="fullstack" className="text-sm font-medium">
                      全栈开发
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={startInterview}
                    disabled={!position}
                    className="px-6"
                  >
                    开始面试
                  </Button>
                </div>
              </div>
            )}

            {/* 聊天区域 */}
            <div className="h-[50vh] overflow-y-auto border rounded-lg p-4 mb-4 bg-card">
              {messages.length === 0 && status !== 'idle' ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {status === 'started' ? '面试官正在准备问题...' : '开始面试吧 👋'}
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <ChatMessage
                      key={msg.id || i}
                      role={msg.role}
                      content={msg.content}
                      extraContent={msg.rating ? <RatingDisplay rating={msg.rating} /> : undefined}
                    />
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
                        面试官正在思考...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}

              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </div>

            {/* 面试控制区域 */}
            {status === 'started' && (
              <div className="space-y-4">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="请输入您的答案..."
                  disabled={isLoading}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={submitAnswer}
                    disabled={isLoading || !input.trim()}
                    className="flex-1"
                  >
                    {isLoading ? <RotateCcwIcon className="animate-spin mr-2" /> : <StarIcon className="mr-2 w-4 h-4" />}
                    提交答案并评分
                  </Button>

                  <Button
                    onClick={requestNextQuestion}
                    variant="outline"
                    disabled={isLoading}
                  >
                    下一题
                  </Button>
                </div>
              </div>
            )}

            {/* 面试完成或结束按钮 */}
            {status === 'started' && (
              <div className="flex justify-between items-center mt-3">
                <Button variant="destructive" size="sm" onClick={startNewInterview}>
                  结束面试
                </Button>
              </div>
            )}

            {/* 新面试按钮 */}
            {status !== 'idle' && messages.length === 0 && (
              <div className="flex justify-center mt-3">
                <Button onClick={startNewInterview}>
                  开始新面试
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}