// src/lib/vector-store.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentChunk, VectorStore } from '@/types/vector';
import { generateEmbedding } from './embedder';
import { splitIntoChunks } from './chunker';

const VECTORS_PATH = path.join(process.cwd(), 'data', 'vectors.json');

// 确保 data 目录存在
if (!fs.existsSync(path.dirname(VECTORS_PATH))) {
  fs.mkdirSync(path.dirname(VECTORS_PATH), { recursive: true });
}

/**
 * 将解析后的文档文本存入本地向量库
 */
export async function ingestDocument(filename: string, fullText: string): Promise<void> {
  // 1. 分块
  const texts = splitIntoChunks(fullText, { maxChunkSize: 512, overlap: 64 });
  
  // 2. 为每个 chunk 生成 embedding（用 'passage' 模式）
  const chunks: DocumentChunk[] = [];
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i].trim();
    if (text.length < 10) continue; // 跳过太短的

    const embedding = await generateEmbedding(text); // 注意：这里用 'passage'

    chunks.push({
      id: `${filename}_chunk_${i}`,
      text,
      embedding,
      metadata: {
        filename,
        source: `chunk_${i}`
      }
    });
  }

  // 3. 保存到 JSON 文件
  const store: VectorStore = {
    chunks,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(VECTORS_PATH, JSON.stringify(store, null, 2));
  console.log(`✅ 向量已保存，共 ${chunks.length} 个 chunk`);
}

/**
 * 从本地加载向量库（全量加载到内存）
 */
export function loadVectorStore(): VectorStore | null {
  if (!fs.existsSync(VECTORS_PATH)) return null;

  const content = fs.readFileSync(VECTORS_PATH, 'utf8');
  return JSON.parse(content) as VectorStore;
}