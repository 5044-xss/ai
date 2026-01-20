// src/lib/rag-retriever.ts
import { cosineSimilarity } from './similarity';
import { generateEmbedding } from './embedder';
import { loadVectorStore } from './vector-store';

const MIN_SCORE = 0.5; // 根据你的数据调整
/**
 * 根据问题检索最相关的文档片段
 */
export async function retrieveRelevantChunks(question: string, topK = 3) {
  const store = loadVectorStore();
  if (!store) return [];

  // 1. 问题转 embedding（用 'query' 模式）
  const queryEmbedding = await generateEmbedding(`query: ${question}`); // 注意：这里用 'query'

  // 2. 计算相似度
  const scoredChunks = store.chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // 3. 按分数排序，取 Top-K
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ text, score }) => ({ text, score }));
  
  // return scoredChunks
  //   .filter(chunk => chunk.score > MIN_SCORE) // ← 关键！
  //   .sort((a, b) => b.score - a.score)
  //   .slice(0, topK)
  //   .map(({ text, score }) => ({ text, score }));
}