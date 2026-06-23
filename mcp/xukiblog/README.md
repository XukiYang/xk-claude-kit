# XukiBlogs MCP Server

Claude Code 博客管理工具，通过 MCP 协议操作 XukiBlogs 后端 API。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `BLOG_API_URL` | 否 | `http://localhost:3000` | 博客 API 地址 |
| `BLOG_ADMIN_PASSWORD` | 是 | — | 管理员密码 |

## Claude Code 配置

在项目的 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "xukiblog": {
      "command": "node",
      "args": ["<path-to-xk-claude-kit>/mcp/xukiblog/index.js"],
      "env": {
        "BLOG_API_URL": "http://your-server:3000",
        "BLOG_ADMIN_PASSWORD": "your-password"
      }
    }
  }
}
```

## 可用工具

### 文章管理
- `list_articles` — 列出文章（含草稿和隐藏）
- `get_article` — 获取文章详情
- `create_article` — 创建文章
- `update_article` — 更新文章
- `delete_article` — 删除文章
- `toggle_article_hidden` — 切换隐藏状态
- `get_tags` — 获取标签/作者/分类列表

### 评论管理
- `list_comments` — 列出评论
- `approve_comment` — 审批评论
- `delete_comment` — 删除评论

### 站点设置
- `get_settings` — 获取设置
- `update_settings` — 更新设置
