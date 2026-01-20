//定义数据结构
export interface DocumentChunk {
  id: string;
  text: string;           // 原始文本片段
  embedding: number[];    // 向量（float 数组）
  metadata: {
    filename: string;
    source: string;       // 如 'page_5'
  };
}

export interface VectorStore {
  chunks: DocumentChunk[];
  createdAt: string;
}