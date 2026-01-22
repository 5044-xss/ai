/* -------------------------- //文件分块 ------------------------- */
export function chunkTextWithMetadata(
  text: string,
  source: string,
  htmlPath: string,
  chunkSize = 50,
  overlap = 50
) {
  // const sentences = (text.match(/\s*([^!]+?)\s*!/g) || []).filter(p => p.trim().length > 0);
  // 按照段落分割
  const sentences = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks: Array<{
    text: string;
    metadata: {
      source: string;      // 文档名
      htmlPath: string;    // HTML 文件路径
      startIdx: number;    // 在原文中的起始字符位置
      paragraphId?: string; // 可选：段落 ID（用于高亮）
    };
  }> = [];


  let currentChunk = '';
  let startPos = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    if (currentChunk.length + sentence.length > chunkSize && currentChunk) {
      chunks.push({
        text: source + currentChunk.trim(),
        metadata: {
          source,
          htmlPath,
          startIdx: startPos,
        },
      });
      startPos += currentChunk.length;
      currentChunk = sentence + ' ';
    } else {
      currentChunk += sentence + ' ';
    }
  }

  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: {
        source,
        htmlPath,
        startIdx: startPos,
      },
    });
  }

  return chunks;
}
