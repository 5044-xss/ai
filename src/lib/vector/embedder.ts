// src/lib/embedder.ts

// 跳过图像支持（避免 sharp 错误）
process.env.TRANSFORMERS_JS_SKIP_IMAGE = 'true';

import { pipeline } from '@xenova/transformers';

let embedder: any = null;
const path = require('path')

/**
 * 生成文本向量（离线，无网络请求）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    console.log('🚀 正在加载本地 bge-small-zh-v1.5 模型...');
    console.log('当前工作目录:', process.cwd());
    console.log('模型路径解析为:', path.resolve('../../../../models/bge-small-zh-v1.5'));

    // 加载本地模型目录（相对于项目根目录）
    embedder = await pipeline(
      'feature-extraction',
      '../../../../models/bge-small-zh-v1.5', // ← 你的本地路径
      {
        quantized: true, // 必须为 true
      }
    );
  }

  // 推理：mean pooling + L2 归一化（符合 BGE 训练方式）
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data); // 转为普通数组
}