// src/lib/vector-store.ts
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

// 定义存储结构
export interface StoredChunk {
  text: string;
  embedding: number[]; // 向量
  metadata: {
    source: string;
    htmlPath: string;
    startIdx: number;
    paragraphId?: string;
  };
}

const VECTOR_STORE_PATH = path.join(process.cwd(), 'data', 'vectors.json');

// 确保 data 目录存在
if (!fs.existsSync(path.dirname(VECTOR_STORE_PATH))) {
  fs.mkdirSync(path.dirname(VECTOR_STORE_PATH), { recursive: true });
}
/* ----------------------------------- // 将分好的块转换成向量存入本地文件  ----------------------------------- */
// 生成 embedding（使用 BGE 模型）
async function generateEmbedding(text: string): Promise<number[]> {
  const { pipeline } = await import('@xenova/transformers');
  const embedder = await pipeline(
    'feature-extraction',
    '../../../../models/bge-small-zh-v1.5', // ← 你的本地路径
    {
      quantized: true,
    }
  );

  // BGE 最佳实践：加 document 前缀
  const output = await embedder(`document: ${text}`, {
    pooling: 'mean',
    normalize: true,
  });

  const result = Array.from(output.data);
  return result
}

// 保存 chunks 到本地向量库
async function saveChunksToVectorStore(
  chunks: Array<{
    text: string;
    metadata: {
      source: string;
      htmlPath: string;
      startIdx: number;
      paragraphId?: string;
    };
  }>
): Promise<void> {
  console.log(`📦 准备为 ${chunks.length} 个片段生成向量...`);

  // 1. 为每个 chunk 生成 embedding
  const embeddedChunks: StoredChunk[] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    embeddedChunks.push({
      text: chunk.text,
      embedding,
      metadata: chunk.metadata,
    });
  }

  // 2. 读取现有向量库（如果存在）
  let existingChunks: StoredChunk[] = [];
  if (fs.existsSync(VECTOR_STORE_PATH)) {
    const rawData = fs.readFileSync(VECTOR_STORE_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    existingChunks = data.chunks || [];
  }

  // 3. 去重：移除同名文档的旧 chunks（避免重复）
  const newSources = new Set(chunks.map(c => c.metadata.source));
  const filteredExisting = existingChunks.filter(
    c => !newSources.has(c.metadata.source)
  );

  // 4. 合并新旧数据
  const allChunks = [...filteredExisting, ...embeddedChunks];

  // 5. 写入文件
  fs.writeFileSync(
    VECTOR_STORE_PATH,
    JSON.stringify({ chunks: allChunks }, null, 2)
  );

  console.log(`✅ 已保存 ${embeddedChunks.length} 个新片段到 ${VECTOR_STORE_PATH}`);
}

/* ----------------------------------- 解析文档 ----------------------------------- */
/**
 * 解析文档（支持 .docx 图文）
 * @param buffer - 文件二进制内容
 * @param fileName - 原始文件名（用于判断格式）
 * @returns { text: string; html: string }
 */
async function parseDocument(buffer: Buffer, fileName: string) {
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

function injectChunkIds(html: string): string {
  const $ = cheerio.load(html, null, false); // 不解析为完整文档（避免 <html><body>）
  let index = 0;

  // 选择所有可能的语义块（按优先级）
  $('p, h1, h2, h3, h4, h5, h6, li, blockquote, table').each((i, elem) => {
    const $elem = $(elem);

    // 跳过空元素或纯图片容器
    if ($elem.text().trim().length < 10 && !$elem.find('img').length) {
      return;
    }

    // 添加唯一 ID 和 class
    $elem.attr('id', `chunk-${index++}`);
    $elem.addClass('doc-chunk');
  });

  return $.html();
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

export { saveChunksToVectorStore, injectChunkIds, parseDocument }