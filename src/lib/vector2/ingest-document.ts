// src/lib/vector-store.ts
import * as fs from 'fs';
import * as path from 'path';

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

// 生成 embedding（使用 BGE 模型）
export async function generateEmbedding(text: string): Promise<number[]> {
  const { pipeline } = await import('@xenova/transformers');
  // const embedder = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5', {
  //   quantized: true, // 更快、更省内存
  // });
  const embedder = await pipeline(
        'feature-extraction',
        '../../../../models/bge-small-zh-v1.5', // ← 你的本地路径
        {
          quantized: true, // 必须为 true
        }
      );

  console.log(text,'text---------');
  
  // BGE 最佳实践：加 document 前缀
  const output = await embedder(`document: ${text}`, {
    pooling: 'mean',
    normalize: true,
  });
 
  const result = Array.from(output.data);
  return result
}

// 保存 chunks 到本地向量库
export async function saveChunksToVectorStore(
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