// lib/sse-handler.ts
export async function processStream(
  response: Response,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  if (!response.body) {
    onError(new Error('No response body'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/); // 兼容 \r\n 和 \n
      buffer = lines.pop() || '';
      for (const line of lines) {
        // ✅ 更健壮：允许 data: 后有任意空白（包括无空格）
        const dataMatch = line.match(/^data:\s*(.*)$/);
        if (!dataMatch) continue;

        const dataStr = dataMatch[1].trim();

        if (dataStr === '[DONE]') {
          onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed?.content; // 只认 .content
          if (typeof delta === 'string') {
            onChunk(delta);
          } else if (Array.isArray(delta)) {
            const result = delta?.[0]?.text
            result ? onChunk(result) : null
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e, 'raw line:', line);
        }
      }
    }

    // 处理剩余 buffer（同样用健壮方式）
    if (buffer.trim()) {
      const remainingLines = buffer.split(/\r?\n/);
      for (const line of remainingLines) {
        const dataMatch = line.match(/^data:\s*(.*)$/);
        if (!dataMatch) continue;

        const dataStr = dataMatch[1].trim();
        if (dataStr === '[DONE]') {
          onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed?.content;
          if (typeof delta === 'string') {
            onChunk(delta);
          } else if (Array.isArray(delta)) {
            const result = delta?.[0]?.text
            result ? onChunk(result) : null
          }
        } catch (e) {
          console.error('Error parsing remaining SSE data:', e, 'line:', line);
        }
      }
    }

    onComplete();
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  } finally {
    reader.releaseLock();
  }
}