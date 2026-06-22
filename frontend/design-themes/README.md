# Design Themes

编译时设计语言管线 + 运行时主题切换系统。通过一个 JSON 文件声明设计意图，编译器自动生成全部 CSS 变量、空间隐喻样式和文档。

## 目录结构

```
design-themes/
  schema.json              # design-spec.json 的 JSON Schema（输入校验）
  compiler/
    compile.cjs            # 编译器：design-spec.json → tokens.css + style.css + SKILL.md
  generated/               # 编译器输出目录（预留）
  presets/
    modern-neutral/        # 中性扁平风格
    fluent/                # Windows 11 Fluent 风格
    glassmorphism/         # 暗色毛玻璃风格
    └── design-spec.json   #   源文件（手写）
    └── tokens.css         #   生成的 CSS 变量
    └── style.css          #   生成的空间隐喻样式
    └── SKILL.md           #   生成的文档
```

## 工作流程

```
design-spec.json ──→ compile.cjs ──→ tokens.css + style.css + SKILL.md
                          │
                    schema.json 校验
                          │
                    ┌─────┴─────┐
                    │  派生逻辑  │
                    │  · 中间值   │
                    │  · 暗色模式 │
                    │  · 工具类   │
                    └───────────┘
```

1. 手写 `design-spec.json`，声明高层语义（颜色、字体、圆角、阴影、空间隐喻）
2. 运行编译器生成三个产物
3. Vue 应用通过 `useDesign()` composable 在运行时切换主题

## 快速开始

### 编译现有主题

```bash
node .claude/skills/frontend/design-themes/compiler/compile.cjs \
  .claude/skills/frontend/design-themes/presets/fluent/design-spec.json
```

### 创建新主题

1. 在 `presets/` 下新建目录，编写 `design-spec.json`
2. 运行编译器生成 CSS 和文档
3. 应用中自动发现新主题（Vite glob import）

### 运行时使用

```js
import { useDesign } from './composables/useDesign'

const { applyDesign, toggleTheme, setTheme, isDark } = useDesign()

applyDesign('fluent')          // 切换到 Fluent 风格
applyDesign('glassmorphism')   // 切换到毛玻璃风格
toggleTheme()                  // 亮色 ↔ 暗色
setTheme('dark')               // 显式设置暗色
applyDesign('fluent', {        // 带覆盖值
  overrides: { '--color-blue': '#ff0000' }
})
```

### 静态引入（单个视图）

```css
@import '../../.claude/skills/frontend/design-themes/presets/glassmorphism/tokens.css';
@import '../../.claude/skills/frontend/design-themes/presets/glassmorphism/style.css';
```

## design-spec.json 字段说明

### 必填字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 主题标识符，kebab-case（如 `"fluent"`） |
| `labels` | object | 文字颜色层级：`primary`/`secondary`/`tertiary`/`quaternary` |
| `backgrounds` | object | 背景层级：`primary`（页面）/`secondary`（卡片）/`tertiary`（分组） |
| `radius` | object | 圆角比例，至少 `xs` + `lg`，编译器派生中间值 |
| `shadows` | object | 阴影比例，至少 `sm`，编译器派生 `md`/`lg`/`thumb` |
| `typography` | object | 字体栈，`body` 必填，`heading` 默认回退到 `body` |
| `spatialMetaphor` | enum | 空间隐喻类型（见下表） |

### 可选字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `mode` | `"light"` \| `"dark"` | 主模式，默认 `"light"` |
| `colors` | object | 语义色板，最多 12 色（blue/red/green/purple/orange 等） |
| `fills` | object | 交互元素填充色，4 级 |
| `grays` | object | 中性灰色阶 |
| `typographyScale` | object | 字号、行高、字重、字间距覆盖 |
| `spacing` | object | 间距比例，映射为 `--space-*` |
| `motion` | object | 动画时长（`durations`）和缓动曲线（`easings`） |
| `opacity` | object | 透明度 token（disabled/muted/subtle/hover） |
| `focusRing` | string | 焦点环颜色，默认取 `colors.blue` |
| `componentSizes` | object | 组件尺寸覆盖（按钮高度、开关尺寸等） |
| `darkOverrides` | object | 暗色模式特定覆盖，deep-merge 到自动派生结果上 |
| `customStyleCSS` | string | 当 `spatialMetaphor="custom"` 时使用的原始 CSS |

### 空间隐喻（spatialMetaphor）

| 值 | style.css 输出 | 视觉效果 |
|----|---------------|---------|
| `flat` | 无 | 纯色平面，无额外工具类 |
| `card-elevation` | `.page-header` `.content-card` | 阴影层级，卡片浮起 |
| `frosted-glass` | `.glass-surface` `.glass-card` | 毛玻璃模糊背景 |
| `ambient-glow` | `.ambient` `.blob` `.glass-surface` `.glass-card` | 彩色光斑 + 毛玻璃 |
| `custom` | 使用 `customStyleCSS` 字段 | 完全自定义 |

## 编译器原理

### Token 派生

编译器从 spec 声明的"关键点"补全中间值：

- `radius` 只给 xs/lg → 自动计算 `--radius-2xl`（xl+4）和 `--radius-full`（9999px）
- `shadows` 只给 sm → 自动派生 md（sm×1.5）、lg（sm×3）、thumb（同 sm）
- `backgrounds` 自动生成 `--bg-grouped-*` 别名

### 暗色模式自动生成

对于 `mode: "light"` 的 spec，编译器基于 WCAG 亮度算法自动生成 `:root[data-theme="dark"]` 块：

- **标签色**：反转层级，primary → `#ffffff`
- **背景色**：使用标准暗色表面值（`#000000`/`#1c1c1e`/`#2c2c2e`）
- **语义色**：计算相对亮度，暗色亮提 30%，亮色暗降 30%
- **阴影**：暗色模式使用更重的扩散

`darkOverrides` 中的值会 deep-merge 到自动派生结果上，用于精细调整。

对于 `mode: "dark"` 的 spec，跳过自动派生，只输出一个 `:root` 块。

### 颜色工具函数

编译器内置完整的颜色处理库：

- `parseColor()` — 解析 hex（#RGB/#RRGGBB/#RRGGBBAA）和 rgba()
- `formatColor()` — 格式化为 CSS 颜色值
- `luminance()` — 计算 WCAG 相对亮度
- `adjustColor()` — 亮度调整（lighten/darken）和透明度

## 内置预设

### modern-neutral

干净、通用、平台无关。蓝色强调色 + 中性灰色骨架。

- 模式：亮色优先
- 空间隐喻：flat
- 字体：Plus Jakarta Sans + Inter

### fluent

Windows 11 Fluent Design。柔和灰底 + 白色卡片 + 蓝色强调。

- 模式：亮色优先
- 空间隐喻：card-elevation
- 字体：Plus Jakarta Sans + Segoe UI Variable
- 附带 `componentSizes`（按钮高度、开关尺寸）

### glassmorphism

暗色太空背景 + 毛玻璃表面 + 发光强调色。

- 模式：暗色优先
- 空间隐喻：ambient-glow
- 字体：Playfair Display（标题）+ Plus Jakarta Sans（正文）

## 集成说明

组件库的 18 个组件通过 `var(--xxx)` 引用 CSS 变量，天然跟随主题切换：

```css
.sk-button {
  background: var(--color-blue);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  color: var(--label-primary);
  font-family: var(--font-body);
}
```

切换主题时，`<style>` 标签被替换，CSS 变量值变化，组件自动更新外观，无需重新渲染。
