// 文本分块
export function splitIntoChunks(text: string, options: { maxChunkSize?: number; overlap?: number } = {}) {
  const { maxChunkSize = 512, overlap = 50 } = options;

  // 按段落分割（保留语义）
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length < maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = para;

      // 如果单个段落超长，按句子切
      if (para.length > maxChunkSize) {
        const sentences = para.match(/[^。！？.!?]+[。！？.!?]?/g) || [para];
        let temp = '';
        for (const sent of sentences) {
          if (temp.length + sent.length < maxChunkSize) {
            temp += sent;
          } else {
            if (temp) chunks.push(temp);
            temp = sent;
          }
        }
        if (temp) chunks.push(temp);
        currentChunk = '';
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  // 添加重叠（提升召回率）
  return addOverlap(chunks, overlap);
}

function addOverlap(chunks: string[], overlap: number): string[] {
  if (chunks.length <= 1) return chunks;
  const result: string[] = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    const prevEnd = chunks[i - 1].slice(-overlap);
    result.push(prevEnd + ' ' + chunks[i]);
  }
  return result;
}