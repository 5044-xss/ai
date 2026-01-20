// src/lib/embedder.ts
// 👇 关键！在导入 transformers 前设置
// process.env.TRANSFORMERS_JS_SKIP_IMAGE = 'true';
// 👇 关键：在导入前设置环境变量（Node.js 环境）
process.env.HF_ENDPOINT = 'https://hf-mirror.com';
process.env.TRANSFORMERS_JS_SKIP_IMAGE = 'true';
import { pipeline, env } from '@xenova/transformers';

// 禁用本地缓存（避免写入 .cache）
env.allowLocalModels = false;

let embedder: any = null;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    console.log('🚀 加载 gte-Qwen embedding 模型（首次较慢）...');
    embedder = await pipeline('feature-extraction', 'Xenova/gte-Qwen', {
      quantized: true, // 使用 INT8 量化，速度更快，内存更小
    });
  }

  // gte-Qwen 需要指定 prompt_name 以获得最佳效果
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
    prompt_name: 'query', // 或 'passage'（对文档用 'passage' 更好）
  });

  return Array.from(output.data); // 转为普通数组
}