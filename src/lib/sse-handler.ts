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


      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });


      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的最后一行
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 移除 'data: ' 前缀

          if (data.trim() === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            // 提取 Delta 内容（DashScope 流式响应格式）
            const delta = parsed?.content;
            if (delta) {
              onChunk(delta);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }

    // 循环结束后，处理缓冲区中剩余的任何数据
    if (buffer.trim()) {
      const remainingLines = buffer.split('\n');
      for (const line of remainingLines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 移除 "data: " 前缀

          // 检查是否为 [DONE] 信号
          if (data.trim() === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(data);

            // 提取 Delta 内容（DashScope 流式响应格式）
            const delta = parsed.output?.choices?.[0]?.delta?.content;
            if (delta) {
              onChunk(delta);
            }
          } catch (e) {
            console.error('Error parsing remaining SSE data:', e, 'data:', data);
          }
        }
      }
    }

    onComplete();
  } catch (error) {
    if (error instanceof Error) {
      onError(error);
    } else {
      onError(new Error('Unknown error occurred'));
    }
  } finally {
    reader.releaseLock();
  }
}