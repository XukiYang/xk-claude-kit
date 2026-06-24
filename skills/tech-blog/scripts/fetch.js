#!/usr/bin/env node

/**
 * tech-blog fetch script
 * 抓取网页正文内容，去除导航、广告等无关元素
 *
 * Usage:
 *   node fetch.js <url> [--max-length N]
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ==================== 内容提取 ====================

/**
 * 需要移除的元素选择器
 */
const REMOVE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  '.sidebar',
  '.navigation',
  '.nav',
  '.menu',
  '.toc',              // 目录，文章内重新生成
  '.breadcrumb',
  '.comments',
  '.comment',
  '.ad',
  '.ads',
  '.advertisement',
  '.social-share',
  '.share',
  '.related',
  '.recommend',
  '.footer',
  '.header',
  '.cookie-banner',
  '.popup',
  '.modal',
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
];

/**
 * 正文候选选择器（按优先级）
 */
const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.content',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.markdown-body',     // GitHub
  '.md-content',        // VuePress
  '.post',
  '.blog-post',
  '#content',
  '#main-content',
];

/**
 * 从 HTML 中提取正文
 */
function extractContent(html, url) {
  const $ = cheerio.load(html);

  // 移除无关元素
  for (const sel of REMOVE_SELECTORS) {
    $(sel).remove();
  }

  // 尝试找到正文容器
  let $content = null;

  for (const sel of CONTENT_SELECTORS) {
    const $el = $(sel).first();
    if ($el.length && $el.text().trim().length > 100) {
      $content = $el;
      break;
    }
  }

  // 如果没找到，用 body
  if (!$content) {
    $content = $('body');
  }

  // 提取文本，保留基本结构
  const text = extractText($, $content);

  return {
    title: $('title').text().trim() || $('h1').first().text().trim(),
    url,
    content: text.trim(),
  };
}

/**
 * 提取文本，保留结构
 */
function extractText($, $el) {
  let result = '';

  $el.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = $(node).text().trim();
      if (text) {
        result += text + ' ';
      }
    } else if (node.type === 'tag') {
      const tagName = node.tagName.toLowerCase();

      // 标题
      if (/^h[1-6]$/.test(tagName)) {
        const level = parseInt(tagName[1]);
        const text = $(node).text().trim();
        if (text) {
          result += '\n' + '#'.repeat(level) + ' ' + text + '\n\n';
        }
      }
      // 段落
      else if (tagName === 'p') {
        const text = $(node).text().trim();
        if (text) {
          result += text + '\n\n';
        }
      }
      // 代码块
      else if (tagName === 'pre') {
        const code = $(node).find('code').text() || $(node).text();
        if (code.trim()) {
          result += '\n```\n' + code.trim() + '\n```\n\n';
        }
      }
      // 行内代码
      else if (tagName === 'code' && node.parent && node.parent.tagName !== 'pre') {
        const text = $(node).text().trim();
        if (text) {
          result += '`' + text + '`';
        }
      }
      // 列表
      else if (tagName === 'ul' || tagName === 'ol') {
        $(node).find('li').each((i, li) => {
          const text = $(li).text().trim();
          if (text) {
            const prefix = tagName === 'ol' ? `${i + 1}. ` : '- ';
            result += prefix + text + '\n';
          }
        });
        result += '\n';
      }
      // 链接
      else if (tagName === 'a') {
        const text = $(node).text().trim();
        const href = $(node).attr('href');
        if (text) {
          if (href && href.startsWith('http')) {
            result += `[${text}](${href})`;
          } else {
            result += text;
          }
        }
      }
      // 表格
      else if (tagName === 'table') {
        const rows = [];
        $(node).find('tr').each((_, tr) => {
          const cells = [];
          $(tr).find('th, td').each((_, cell) => {
            cells.push($(cell).text().trim());
          });
          if (cells.length > 0) {
            rows.push(cells);
          }
        });
        if (rows.length > 0) {
          const lines = rows.map(r => r.join(' | '));
          const separator = rows[0].map(() => '---').join(' | ');
          result += '\n' + [lines[0], separator, ...lines.slice(1)].join('\n') + '\n\n';
        }
      }
      // 其他块级元素，递归处理
      else if (['div', 'section', 'article', 'blockquote', 'figure', 'details'].includes(tagName)) {
        result += extractText($, $(node));
      }
      // 行内元素，递归处理
      else {
        result += extractText($, $(node));
      }
    }
  });

  return result;
}

// ==================== 主流程 ====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node fetch.js <url> [--max-length N]');
    process.exit(1);
  }

  const url = args[0];
  const maxLengthIdx = args.indexOf('--max-length');
  const maxLength = maxLengthIdx !== -1 ? parseInt(args[maxLengthIdx + 1]) : 10000;

  console.log(`[fetch] Fetching: ${url}\n`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      console.error(`[fetch] HTTP ${res.status}: ${res.statusText}`);
      process.exit(1);
    }

    const html = await res.text();
    const result = extractContent(html, url);

    // 截断到指定长度
    if (result.content.length > maxLength) {
      result.content = result.content.substring(0, maxLength) + '\n\n...(内容已截断)';
    }

    console.log(`Title: ${result.title}`);
    console.log(`URL: ${result.url}`);
    console.log(`Content length: ${result.content.length} chars`);
    console.log('\n--- CONTENT ---\n');
    console.log(result.content);

    // 输出 JSON 供程序使用
    console.log('\n\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error(`[fetch] Error: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[fetch] Fatal error:', err);
  process.exit(1);
});
