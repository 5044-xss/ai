// components/SearchResults.tsx
import Link from 'next/link';

interface SearchResult {
  text: string;
  metadata: {
    source: string;      // 原始文档名（如 "用户手册.docx"）
    htmlPath: string;    // 生成的 HTML 路径（如 "/docs/manual.html"）
    startIdx: number;
    paragraphId?: string;
  };
}

export default function SearchResults({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        没有找到相关结果
      </div>
    );
  }

  return (
    <div className="h-[60vh] overflow-y-auto border rounded-lg p-4 mb-4 bg-card">
      {results.map((result, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {/* 检索到的文本内容 */}
          <div className="prose prose-sm max-w-none mb-3">
            <p className="text-gray-800 leading-relaxed">
              {result.text}
            </p>
          </div>

          {/* 元信息：来源 + 操作 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">
              来源: {result.metadata.source}
            </span>

            {/* 跳转到 HTML 原文 */}
            {/* <a href={`${htmlPath}#chunk-5`} target="_blank">查看原文</a> */}
            {/* { } href={result.metadata.htmlPath}      target="_blank" */ }
            <a
              href={`#chunk-10`}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              查看原文
            </a>

            {/* 如果有 paragraphId，可加锚点跳转 */}
            {result.metadata.paragraphId && (
              <a
                href={`${result.metadata.htmlPath}#${result.metadata.paragraphId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 hover:underline"
              >
                跳转到段落
              </a>
            )}
           
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: result.metadata.htmlPath }}
          />
         
        </div>
      ))}
    </div>
  );
}