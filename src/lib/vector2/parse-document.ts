import mammoth from 'mammoth';
import { injectChunkIds } from './inject-chunk-ids'

/**
 * 解析文档（支持 .docx 图文）
 * @param buffer - 文件二进制内容
 * @param fileName - 原始文件名（用于判断格式）
 * @returns { text: string; html: string }
 */
export async function parseDocument(buffer: Buffer, fileName: string) {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

  if (ext === '.pdf') {
    // PDF 暂不支持图片提取（复杂），只返回文本
    const pdf = require('pdf-parse');
    const pdfData = await pdf(buffer);
    const text = pdfData.text;
    // 简单 HTML 包装（无图）
    const html = `<div class="pdf-content">${text.replace(/\n/g, '<br>')}</div>`;
    return { text, html, sourse: fileName };

  } else if (ext === '.docx') {
    // 🔑 关键：使用 convertToHtml 保留图片！
    // const { value: html } = await mammoth.convertToHtml({ buffer });
    // const result = await mammoth.extractRawText({ buffer });
    // console.log(html, 'html');
    
    const { value: rawHtml } = await mammoth.convertToHtml({ buffer });
    // 🔑 注入 chunk ID
    const htmlWithIds = injectChunkIds(rawHtml);

    const text = extractTextFromHtml(htmlWithIds);

    return { text, html: htmlWithIds, sourse: fileName }; 

  } else if (ext === '.doc') {
    throw new Error('目前不支持 .doc 格式，请使用 .pdf 或 .docx 格式');
  } else {
    throw new Error(`不支持的文件格式: ${ext}`);
  }
}


// 辅助函数：从 HTML 提取干净文本
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}