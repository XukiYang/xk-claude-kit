# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code 工具箱，包含 skills（斜杠命令）、设计主题系统、MCP servers。以 **git submodule** 方式嵌入其他项目使用。

## Directory Structure

```
xk-claude-kit/
├── bin/cli.js              # CLI 入口 (npx xk-claude-kit)
├── package.json
├── skills/                 # 可安装的 skill（每个子目录含 SKILL.md）
│   └── git-commit/         # Git 提交规范
├── tools/                  # 有构建流程的工具（产出也是 skill）
│   └── design-themes/      # 设计主题系统
│       ├── schema.json     # design-spec.json 的 JSON Schema
│       ├── compiler/       # design-spec.json → tokens.css + style.css + SKILL.md
│       ├── presets/        # 主题预设（fluent, glassmorphism, modern-neutral）
│       └── README.md
├── mcp/                    # MCP servers（独立可执行服务）
│   └── xukiblog/           # XukiBlogs 博客管理
│       ├── index.js
│       ├── package.json
│       └── README.md
└── CLAUDE.md
```

## Skill File Structure

Skills 是 `skills/` 下的目录，每个含一个 `SKILL.md` 文件：
- Frontmatter：name、description、触发条件
- Body：指令、提示词、嵌入逻辑

CLI 递归扫描所有 `SKILL.md`，用父目录名作为 skill 名。

## Design Themes

每个主题 preset 在 `tools/design-themes/presets/<name>/` 下：
- `design-spec.json` — 手写的设计声明
- `tokens.css` — 编译生成的 CSS 变量
- `style.css` — 编译生成的空间隐喻样式
- `SKILL.md` — 编译生成的文档

重新编译：
```sh
node tools/design-themes/compiler/compile.cjs tools/design-themes/presets/<name>/design-spec.json
```

## npm 安装

```sh
# 安装全部 skill
npx xk-claude-kit install

# 只安装指定 skill
npx xk-claude-kit install git-commit

# 列出所有可用 skill
npx xk-claude-kit list

# 卸载已安装的 skill
npx xk-claude-kit uninstall
```

安装后重启 Claude Code 即可通过 `/skill-name` 使用。
