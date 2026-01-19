import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

// 解析文档内容的辅助函数
async function parseDocument(buffer: Buffer, fileName: string) {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

  if (ext === '.pdf') {
    // ✅ v1.1.1 用法：直接调用函数
    const pdf = require('pdf-parse')
    const pdfData = await pdf(buffer); // ← 返回 { text, numpages, ... }
    return pdfData.text; // ← 直接取 .text
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (ext === '.doc') {
    throw new Error('目前不支持.doc格式，请使用.pdf或.docx格式');
  } else {
    throw new Error(`不支持的文件格式: ${ext}`);
  }
}

// 分析文档内容并提取关键词的函数（保持不变）
function analyzeDocument(text: string) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those'].includes(word));

  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const analysisResult = {
    totalWords: words.length,
    uniqueWords: Object.keys(wordCount).length,
    keywords: sortedWords.map(([word, count]) => ({ word, count })),
    summary: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
  };

  return analysisResult;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未找到上传的文件' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const documentText = await parseDocument(buffer, file.name);
    const analysis = analyzeDocument(documentText);

    return NextResponse.json({
      success: true,
      analysis,
      filename: file.name,
    });
  } catch (error: any) {
    console.error('文档分析错误:', error);
    return NextResponse.json(
      { error: `文档分析失败: ${error.message}` },
      { status: 500 }
    );
  }
}