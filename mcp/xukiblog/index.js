#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Config from env
// ---------------------------------------------------------------------------

const API_URL = (process.env.BLOG_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const ADMIN_PASSWORD = process.env.BLOG_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("BLOG_ADMIN_PASSWORD environment variable is required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP client with auto-login
// ---------------------------------------------------------------------------

let token = null;

async function api(method, path, body = null) {
  // Auto-login if no token
  if (!token) {
    await login();
  }

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let res = await fetch(`${API_URL}${path}`, opts);

  // Token expired, re-login
  if (res.status === 401 && token) {
    token = null;
    await login();
    headers["Authorization"] = `Bearer ${token}`;
    opts.headers = headers;
    res = await fetch(`${API_URL}${path}`, opts);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function login() {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Login failed (${res.status}). Check BLOG_ADMIN_PASSWORD.`);
  }

  const data = await res.json();
  token = data.token;
  return token;
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "xukiblog",
  version: "0.1.0",
});

// --- 文章管理 ---

server.tool("list_articles", "列出博客文章（管理员视图，含草稿和隐藏文章）", {
  search: z.string().optional().describe("搜索关键词"),
  category: z.string().optional().describe("分类筛选"),
  page: z.number().optional().describe("页码，默认 1"),
  limit: z.number().optional().describe("每页数量，默认 20"),
}, async (args) => {
  const params = new URLSearchParams();
  if (args.search) params.set("search", args.search);
  if (args.category) params.set("category", args.category);
  if (args.page) params.set("page", args.page);
  if (args.limit) params.set("limit", args.limit);
  const data = await api("GET", `/api/admin/articles?${params}`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("get_article", "获取文章详情（含 Markdown 原文）", {
  id: z.number().describe("文章 ID"),
}, async (args) => {
  const data = await api("GET", `/api/admin/articles/${args.id}`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("create_article", "创建新文章", {
  title: z.string().describe("文章标题"),
  content_md: z.string().describe("Markdown 内容"),
  slug: z.string().optional().describe("URL slug，不填则自动从标题生成"),
  excerpt: z.string().optional().describe("摘要"),
  category: z.string().optional().describe("分类"),
  author: z.string().optional().describe("作者，默认 XukiYang"),
  tags: z.array(z.string()).optional().describe("标签数组，如 [\"Vue\", \"Node.js\"]"),
  published_at: z.string().optional().describe("发布时间 ISO 格式，空字符串表示草稿"),
}, async (args) => {
  const body = {
    title: args.title,
    content_md: args.content_md,
  };
  if (args.slug) body.slug = args.slug;
  if (args.excerpt) body.excerpt = args.excerpt;
  if (args.category) body.category = args.category;
  if (args.author) body.author = args.author;
  if (args.tags) body.tags = JSON.stringify(args.tags);
  if (args.published_at !== undefined) body.published_at = args.published_at;

  const data = await api("POST", "/api/admin/articles", body);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("update_article", "更新已有文章（部分更新，只传需要改的字段）", {
  id: z.number().describe("文章 ID"),
  title: z.string().optional().describe("新标题"),
  content_md: z.string().optional().describe("新 Markdown 内容"),
  slug: z.string().optional().describe("新 URL slug"),
  excerpt: z.string().optional().describe("新摘要"),
  category: z.string().optional().describe("新分类"),
  author: z.string().optional().describe("新作者"),
  tags: z.array(z.string()).optional().describe("新标签数组"),
  published_at: z.string().optional().describe("新发布时间"),
}, async (args) => {
  const { id, ...rest } = args;
  const body = {};
  if (rest.title) body.title = rest.title;
  if (rest.content_md) body.content_md = rest.content_md;
  if (rest.slug) body.slug = rest.slug;
  if (rest.excerpt) body.excerpt = rest.excerpt;
  if (rest.category) body.category = rest.category;
  if (rest.author) body.author = rest.author;
  if (rest.tags) body.tags = JSON.stringify(rest.tags);
  if (rest.published_at !== undefined) body.published_at = rest.published_at;

  const data = await api("PUT", `/api/admin/articles/${id}`, body);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("delete_article", "删除文章", {
  id: z.number().describe("文章 ID"),
}, async (args) => {
  const data = await api("DELETE", `/api/admin/articles/${args.id}`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("toggle_article_hidden", "切换文章隐藏/显示状态", {
  id: z.number().describe("文章 ID"),
}, async (args) => {
  const data = await api("PATCH", `/api/admin/articles/${args.id}/toggle-hidden`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("get_tags", "获取所有已使用的标签、作者、分类列表", {}, async () => {
  const data = await api("GET", "/api/admin/tags");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

// --- 评论管理 ---

server.tool("list_comments", "列出评论（管理员视图）", {
  status: z.enum(["pending", "approved"]).optional().describe("按状态筛选"),
  page: z.number().optional().describe("页码"),
  limit: z.number().optional().describe("每页数量"),
}, async (args) => {
  const params = new URLSearchParams();
  if (args.status) params.set("status", args.status);
  if (args.page) params.set("page", args.page);
  if (args.limit) params.set("limit", args.limit);
  const data = await api("GET", `/api/admin/comments?${params}`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("approve_comment", "审批通过评论", {
  id: z.number().describe("评论 ID"),
}, async (args) => {
  const data = await api("PUT", `/api/admin/comments/${args.id}/approve`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("delete_comment", "删除评论", {
  id: z.number().describe("评论 ID"),
}, async (args) => {
  const data = await api("DELETE", `/api/admin/comments/${args.id}`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

// --- 站点设置 ---

server.tool("get_settings", "获取站点设置", {}, async () => {
  const data = await api("GET", "/api/admin/settings");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("update_settings", "更新站点设置", {
  site_logo: z.string().optional().describe("站点名称"),
  about_name: z.string().optional().describe("关于页姓名"),
  about_title: z.string().optional().describe("关于页标题"),
  about_description: z.string().optional().describe("关于页描述"),
  about_avatar: z.string().optional().describe("关于页头像 emoji"),
  about_links: z.string().optional().describe("关于页链接 JSON 数组"),
  about_github: z.string().optional().describe("GitHub 链接"),
  about_email: z.string().optional().describe("邮箱"),
  footer_text: z.string().optional().describe("页脚文字"),
  icp_beian: z.string().optional().describe("ICP 备案号"),
}, async (args) => {
  const body = {};
  for (const [k, v] of Object.entries(args)) {
    if (v !== undefined) body[k] = v;
  }
  const data = await api("PUT", "/api/admin/settings", body);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

// --- 启动 ---

const transport = new StdioServerTransport();
await server.connect(transport);
