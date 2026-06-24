#!/usr/bin/env node

/**
 * tech-blog search script
 * 搜索技术文档、社区文章、AI Agent 资源
 *
 * Usage:
 *   node search.js <query> [source]
 *
 * source: docs | community | ai | misc | general | all (default: all)
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// ==================== 搜索源配置 ====================

const SEARCH_SOURCES = {
  // 第一优先级：官方文档
  docs: [
    { name: 'MDN', site: 'developer.mozilla.org' },
    { name: 'Python Docs', site: 'docs.python.org' },
    { name: 'Node.js Docs', site: 'nodejs.org' },
    { name: 'React Docs', site: 'react.dev' },
    { name: 'Vue Docs', site: 'vuejs.org' },
    { name: 'Next.js Docs', site: 'nextjs.org' },
    { name: 'TypeScript Docs', site: 'typescriptlang.org' },
    { name: 'Rust Docs', site: 'doc.rust-lang.org' },
    { name: 'Go Docs', site: 'go.dev' },
  ],

  // 第一优先级：技术社区
  community: [
    { name: 'Stack Overflow', site: 'stackoverflow.com' },
    { name: 'GitHub', site: 'github.com' },
    { name: 'Dev.to', site: 'dev.to' },
    { name: 'Medium', site: 'medium.com' },
    { name: '掘金', site: 'juejin.cn' },
    { name: '思否', site: 'segmentfault.com' },
  ],

  // 第一优先级：AI Agent
  ai: [
    { name: 'OpenAI Docs', site: 'platform.openai.com' },
    { name: 'Anthropic Docs', site: 'docs.anthropic.com' },
    { name: 'LangChain Docs', site: 'python.langchain.com' },
    { name: 'LlamaIndex Docs', site: 'docs.llamaindex.ai' },
    { name: 'Hugging Face', site: 'huggingface.co' },
    { name: 'CrewAI Docs', site: 'docs.crewai.com' },
    { name: 'AutoGPT', site: 'github.com/Significant-Gravitas/AutoGPT' },
    { name: 'Papers With Code', site: 'paperswithcode.com' },
  ],

  // 第二优先级：综合技术社区
  misc: [
    { name: 'CSDN', site: 'blog.csdn.net' },
    { name: '博客园', site: 'cnblogs.com' },
    { name: 'InfoQ', site: 'infoq.cn' },
    { name: 'V2EX', site: 'v2ex.com' },
  ],

  // 第三优先级：泛内容平台
  general: [
    { name: '知乎', site: 'zhihu.com' },
    { name: '小红书', site: 'xiaohongshu.com' },
    { name: 'B站专栏', site: 'bilibili.com' },
  ],
};

// ==================== 搜索实现 ====================

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * 使用 Bing site: 搜索
 */
async function searchBing(query, site = null, num = 5) {
  const q = site ? `site:${site} ${query}` : query;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=${num}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    // 解析 Bing 搜索结果
    $('li.b_algo').each((i, el) => {
      const titleEl = $(el).find('h2 a').first();
      const snippetEl = $(el).find('.b_caption p, .b_lineclamp2').first();

      const title = titleEl.text().trim();
      const href = titleEl.attr('href');
      const snippet = snippetEl.text().trim();

      if (title && href && href.startsWith('http')) {
        results.push({ title, url: href, snippet });
      }
    });

    return results;
  } catch (err) {
    console.error(`[search] Bing search failed: ${err.message}`);
    return [];
  }
}

/**
 * 根据 URL 判断来源
 */
function detectSource(url) {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('developer.mozilla.org')) return 'MDN';
  if (urlLower.includes('docs.python.org') || urlLower.includes('pythonlang.cn')) return 'Python Docs';
  if (urlLower.includes('nodejs.org')) return 'Node.js Docs';
  if (urlLower.includes('react.dev')) return 'React Docs';
  if (urlLower.includes('vuejs.org')) return 'Vue Docs';
  if (urlLower.includes('nextjs.org')) return 'Next.js Docs';
  if (urlLower.includes('typescriptlang.org')) return 'TypeScript Docs';
  if (urlLower.includes('doc.rust-lang.org')) return 'Rust Docs';
  if (urlLower.includes('go.dev')) return 'Go Docs';
  if (urlLower.includes('stackoverflow.com')) return 'Stack Overflow';
  if (urlLower.includes('github.com')) return 'GitHub';
  if (urlLower.includes('dev.to')) return 'Dev.to';
  if (urlLower.includes('medium.com')) return 'Medium';
  if (urlLower.includes('juejin.cn')) return '掘金';
  if (urlLower.includes('segmentfault.com')) return '思否';
  if (urlLower.includes('platform.openai.com')) return 'OpenAI Docs';
  if (urlLower.includes('docs.anthropic.com')) return 'Anthropic Docs';
  if (urlLower.includes('langchain.com')) return 'LangChain Docs';
  if (urlLower.includes('llamaindex.ai')) return 'LlamaIndex Docs';
  if (urlLower.includes('huggingface.co')) return 'Hugging Face';
  if (urlLower.includes('crewai.com')) return 'CrewAI Docs';
  if (urlLower.includes('paperswithcode.com')) return 'Papers With Code';
  if (urlLower.includes('blog.csdn.net')) return 'CSDN';
  if (urlLower.includes('cnblogs.com')) return '博客园';
  if (urlLower.includes('infoq.cn')) return 'InfoQ';
  if (urlLower.includes('v2ex.com')) return 'V2EX';
  if (urlLower.includes('zhihu.com')) return '知乎';
  if (urlLower.includes('xiaohongshu.com')) return '小红书';
  if (urlLower.includes('bilibili.com')) return 'B站';
  if (urlLower.includes('runoob.com')) return '菜鸟教程';
  if (urlLower.includes('liaoxuefeng.com')) return '廖雪峰';
  if (urlLower.includes('freecodecamp.org')) return 'freeCodeCamp';
  if (urlLower.includes('cloud.tencent.com')) return '腾讯云';
  if (urlLower.includes('jianshu.com')) return '简书';

  return '其他';
}

/**
 * 带并发控制的批量搜索
 */
async function searchWithConcurrency(query, sources, concurrency = 4) {
  const results = [];
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (src) => {
        const items = await searchBing(query, src.site, 3);
        for (const r of items) {
          r.source = detectSource(r.url);
        }
        return items;
      })
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        results.push(...s.value);
      }
    }
    if (i + concurrency < sources.length) {
      await sleep(300);
    }
  }
  return results;
}

/**
 * 搜索单个源分类
 */
async function searchSource(query, sourceKey) {
  const sources = SEARCH_SOURCES[sourceKey];
  if (!sources) {
    console.error(`[search] Unknown source: ${sourceKey}`);
    return [];
  }

  return searchWithConcurrency(query, sources);
}

/**
 * 搜索所有源
 */
async function searchAll(query) {
  const results = {
    docs: await searchSource(query, 'docs'),
    community: await searchSource(query, 'community'),
    ai: await searchSource(query, 'ai'),
    misc: await searchSource(query, 'misc'),
    general: await searchSource(query, 'general'),
  };

  return results;
}

// ==================== 工具函数 ====================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatResults(results) {
  if (results.length === 0) {
    return '  (无结果)';
  }

  return results.map((r, i) => {
    return `  ${i + 1}. [${r.source}] ${r.title}
     ${r.url}
     ${r.snippet || '(无摘要)'}`;
  }).join('\n');
}

// ==================== 主流程 ====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node search.js <query> [source]');
    console.log('');
    console.log('Source options:');
    console.log('  docs      - 官方文档 (MDN, Python, Node.js, React, Vue...)');
    console.log('  community - 技术社区 (Stack Overflow, GitHub, Dev.to, 掘金...)');
    console.log('  ai        - AI Agent (OpenAI, Anthropic, LangChain, Hugging Face...)');
    console.log('  misc      - 综合技术社区 (CSDN, 博客园, InfoQ, V2EX)');
    console.log('  general   - 泛内容平台 (知乎, 小红书, B站)');
    console.log('  all       - 所有源 (default)');
    process.exit(1);
  }

  const query = args[0];
  const source = args[1] || 'all';

  console.log(`[search] Searching: "${query}" (source: ${source})\n`);

  if (source === 'all') {
    const results = await searchAll(query);

    for (const [key, items] of Object.entries(results)) {
      console.log(`\n=== ${key.toUpperCase()} ===`);
      console.log(formatResults(items));
    }

    // 输出 JSON 供程序使用
    const allItems = Object.values(results).flat();
    console.log('\n\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(allItems, null, 2));
  } else {
    const results = await searchSource(query, source);
    console.log(formatResults(results));

    // 输出 JSON 供程序使用
    console.log('\n\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch(err => {
  console.error('[search] Fatal error:', err);
  process.exit(1);
});
