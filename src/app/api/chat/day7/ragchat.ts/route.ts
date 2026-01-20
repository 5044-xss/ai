// src/app/api/rag-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callQwen } from '@/lib/vector/qwen'; // 你之前封装的 Qwen 调用
import { retrieveRelevantChunks } from '@/lib/vector/rag-retriever';

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    console.log(question,'question');
    

    // 1. 检索相关上下文
    const relevantChunks = await retrieveRelevantChunks(question, 3);
    const context = relevantChunks.map(c => c.text).join('\n\n');

    // 2. 构造 Prompt
    const systemPrompt = `你是一个智能文档助手，请严格基于以下文档内容回答问题。
如果文档中没有相关信息，请回答：“根据提供的文档，无法回答该问题。”

文档内容：
${context}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question }
    ];

    // 3. 调用 Qwen（流式或非流式）
    const response = await callQwen(messages);

    // 如果是非流式，直接返回
    const result = await response.json();
    const answer = result.output?.choices?.[0]?.message?.content || '抱歉，无法生成答案。';
    return NextResponse.json({ answer, sources: relevantChunks });



  } catch (error: any) {
    console.error('RAG chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}