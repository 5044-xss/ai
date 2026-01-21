import * as cheerio from 'cheerio';

export function injectChunkIds(html: string): string {
  const $ = cheerio.load(html, null, false); // 不解析为完整文档（避免 <html><body>）
  let index = 0;

  // 选择所有可能的语义块（按优先级）
  $('p, h1, h2, h3, h4, h5, h6, li, blockquote, table').each((i, elem) => {
    const $elem = $(elem);

    // 跳过空元素或纯图片容器
    if ($elem.text().trim().length < 10 && !$elem.find('img').length) {
      return;
    }

    // 添加唯一 ID 和 class
    $elem.attr('id', `chunk-${index++}`);
    $elem.addClass('doc-chunk');
  });

  return $.html();
}