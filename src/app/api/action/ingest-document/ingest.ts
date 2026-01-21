import { parseDocx } from './doc-parser';
import { chunkTextWithMetadata } from './chunker';
import { generateDocEmbedding } from './embedder'; // 注意：用 doc 模式
import fs from 'fs';
import path from 'path';

export async function ingestDocx(filePath: string) {
  // 1. 解析 Word
  const { text, htmlPath, source } = await parseDocx(filePath);
  console.log(`📄 解析完成: ${source}`);
}