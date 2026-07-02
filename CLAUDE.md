# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code 工具箱，包含 skills（斜杠命令）和 MCP servers。以 **git submodule** 方式嵌入其他项目使用。

## Directory Structure

```
xk-claude-kit/
├── bin/cli.js              # CLI 入口 (npx xk-claude-kit)
├── package.json
├── skills/                 # 可安装的 skill（每个子目录含 SKILL.md）
│   ├── git-commit/         # Git 提交规范
│   ├── mock-interview/     # 模拟面试
│   └── tech-blog/          # 技术博客写作（含 scripts/ 搜索脚本）
│       ├── SKILL.md
│       ├── scripts/        # search.js + fetch.js（Bing 搜索 + 页面抓取）
│       └── examples/
└── mcp/                    # MCP servers（独立可执行服务）
    └── xukiblog/           # XukiBlogs 博客管理
```

## Skill File Structure

Skills 是 `skills/` 下的目录，每个含一个 `SKILL.md` 文件：
- Frontmatter：name、description、触发条件
- Body：指令、提示词、嵌入逻辑
- 可包含 `scripts/` 子目录，安装时会一并复制

CLI 递归扫描所有 `SKILL.md`，用父目录名作为 skill 名。

## CLI

```sh
# 列出所有可用 skill
npx xk-claude-kit list

# 安装全部 skill 到项目 .claude/commands/
npx xk-claude-kit install

# 安装指定 skill
npx xk-claude-kit install git-commit

# 安装到全局 ~/.claude/commands/（所有项目可用）
npx xk-claude-kit install tech-blog --global

# 卸载
npx xk-claude-kit uninstall
npx xk-claude-kit uninstall --global
```

安装后重启 Claude Code 即可通过 `/skill-name` 使用。

## MCP Servers

- `mcp/xukiblog/` — XukiBlogs 博客管理 MCP server，配置见 `.mcp.json`
