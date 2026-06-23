---
name: git-commit
description: 创建符合 Conventional Commits 规范的 git 提交。当用户要求提交代码、创建 commit、或提到"提交"、"commit"、"git commit"时使用。
---

# Git Commit

根据 [Conventional Commits](https://www.conventionalcommits.org/) 规范创建高质量的 git 提交。

## 提交信息格式

```
<type>(<scope>): <subject>

[body]

[footer]
```

## 类型（type）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): 添加微信登录` |
| `fix` | 修复 bug | `fix(api): 修复分页参数越界` |
| `docs` | 仅文档变更 | `docs(readme): 更新部署说明` |
| `style` | 不影响代码含义的变更（空格、格式等） | `style: 统一缩进为 2 空格` |
| `refactor` | 既不修复 bug 也不添加功能的代码变更 | `refactor(utils): 抽取日期格式化函数` |
| `perf` | 性能优化 | `perf(list): 虚拟滚动优化大列表渲染` |
| `test` | 添加或修正测试 | `test(auth): 补充登录模块单元测试` |
| `build` | 构建系统或外部依赖变更 | `build: 升级 vite 到 v6` |
| `ci` | CI 配置文件和脚本变更 | `ci: 添加 staging 环境自动部署` |
| `chore` | 其他不修改 src 或 test 的变更 | `chore: 清理无用依赖` |
| `revert` | 回退之前的提交 | `revert: 回退 feat(auth) 微信登录` |

## 工作流程

### 1. 分析变更

在提交前，先查看所有变更内容：

```bash
git status          # 查看哪些文件有变更
git diff            # 查看未暂存的变更
git diff --cached   # 查看已暂存的变更
git log --oneline -5 # 查看最近的提交风格
```

### 2. 拆分提交（原子提交）

每个提交应该是**单一职责**的、可独立理解的变更单元：

- 一个功能变更 + 其对应的测试 → 一个提交
- 不相关的格式修复 → 单独提交
- 重构和功能变更 → 分开提交
- 依赖升级 → 单独提交

**反模式（避免）：**
```
fix: 一堆杂项修改          # 太模糊
feat: 完成用户模块          # 一个提交包含太多变更
update                      # 无类型、无意义
```

### 3. 暂存文件

按逻辑分组暂存，避免 `git add .` 或 `git add -A`：

```bash
# 精确暂存相关文件
git add src/auth/login.ts src/auth/login.test.ts

# 交互式暂存（选择性暂存部分修改）
git add -p src/utils.ts
```

### 4. 编写提交信息

**Subject 行规则：**

- 使用中文或英文，保持仓库内一致
- 不超过 50 个字符
- 使用祈使语气（"添加" 而非 "添加了"）
- 首字母小写
- 末尾不加句号

**Body 规则（可选）：**

- 与 subject 空一行
- 解释 **为什么** 做这个变更，而不是做了什么
- 每行不超过 72 个字符
- 列出关键变更点

**Footer 规则（可选）：**

- 关联 Issue：`Closes #123` / `Fixes #456`
- 标记破坏性变更：`BREAKING CHANGE: 描述`

### 5. 破坏性变更

当变更破坏了向后兼容性时，必须在 type 后加 `!` 并在 footer 说明：

```
feat!(api): 移除 v1 接口

BREAKING CHANGE: v1 REST API 已全部移除，请迁移到 v2。
```

## 完整示例

### 简单修复
```bash
git commit -m "fix(auth): 修复 token 过期后未自动刷新的问题"
```

### 带详细说明的新功能
```bash
git commit -m "feat(search): 添加全文搜索支持

- 集成 Elasticsearch 作为搜索引擎
- 支持中英文分词
- 搜索结果按相关度排序
- 添加搜索历史记录功能

Closes #234"
```

### 重构
```bash
git commit -m "refactor(db): 将数据库连接池从手写实现切换到 HikariCP

原有连接池在高并发下存在连接泄漏问题，
HikariCP 性能更好且经过生产验证。"
```

## 提交前检查清单

- [ ] 变更已通过本地测试（`npm test` / `go test` 等）
- [ ] 代码已通过 lint 检查（`npm run lint` / `golangci-lint run` 等）
- [ ] 没有遗留调试代码（`console.log`、`fmt.Println`、`TODO` 临时代码）
- [ ] 没有提交敏感信息（密钥、密码、token、`.env` 文件）
- [ ] 暂存区文件都是本次变更相关的
- [ ] 提交信息遵循 Conventional Commits 格式
- [ ] 一个提交只做一件事（原子提交）

## 常见错误

| 错误做法 | 正确做法 |
|----------|----------|
| `git commit -m "fix bug"` | `fix(api): 修复用户列表查询空指针异常` |
| `git commit -m "update"` | `docs: 更新 README 安装步骤` |
| `git add . && git commit` | 按逻辑分组 `git add` 后分别提交 |
| 功能和重构混在一个提交 | 拆分为 `refactor` 和 `feat` 两个提交 |
| 提交信息用过去时 | 使用祈使语气："添加" 而非 "添加了" |
| subject 末尾加句号 | 末尾不加标点 |
