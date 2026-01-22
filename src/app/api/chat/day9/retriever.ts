// src/lib/retriever.ts
// import { StoredChunk } from './vector-store';
import * as fs from 'fs';
import * as path from 'path';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8); // 防止除零
}

// export function cosineSimilarity(a: number[], b: number[]): number {
//   let sum = 0;
//   for (let i = 0; i < a.length; i++) {
//     sum += a[i] * b[i];
//   }
//   return sum;
// }
export async function retrieve(query: string, topK = 3) {
  const { pipeline } = await import('@xenova/transformers');
  const embedder = await pipeline('feature-extraction',
    '../../../../models/bge-small-zh-v1.5', {
    quantized: true, // 必须为 true
  });
  const queryEmb = Array.from((await embedder(`query: ${query}`, {
    pooling: 'mean',     // ← 关键！将 token 序列池化为单个向量
    normalize: true      // ← 关键！L2 归一化（提升检索效果）
  })).data);

  const data = JSON.parse(fs.readFileSync('data/vectors.json', 'utf-8')) as { chunks: StoredChunk[] };

  const results = data.chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmb, chunk.embedding)
  }))
    .filter(r => {
      console.log(r.score, 'score值', query);
      return r.score > 0.4
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  console.log(results[0], 'results', queryEmb.length);

  return results; // 包含 text + metadata！
}