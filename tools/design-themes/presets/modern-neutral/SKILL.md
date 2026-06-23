---
name: modern-neutral
description: Clean, generic, platform-agnostic. Blue accent on neutral gray skeleton.
---

# modern-neutral

Clean, generic, platform-agnostic. Blue accent on neutral gray skeleton.

## Design Philosophy

- **Mode**: Light-first
- **Spatial metaphor**: Flat — clean surfaces, no elevation effects

## Token Reference

### Colors

| Token | Value |
|-------|-------|
| `--color-blue` | #3b82f6 |
| `--color-red` | #ef4444 |
| `--color-green` | #22c55e |
| `--color-purple` | #8b5cf6 |
| `--color-orange` | #f97316 |

### Labels

| Token | Value |
|-------|-------|
| `--label-primary` | #18181b |
| `--label-secondary` | #71717a |
| `--label-tertiary` | #a1a1aa |
| `--label-quaternary` | #d4d4d8 |

### Backgrounds

| Token | Value |
|-------|-------|
| `--bg-primary` | #fafafa |
| `--bg-secondary` | #f4f4f5 |
| `--bg-tertiary` | #ffffff |

### Radius

| Token | Value |
|-------|-------|
| `--radius-xs` | 4px |
| `--radius-sm` | 8px |
| `--radius-md` | 10px |
| `--radius-lg` | 14px |
| `--radius-xl` | 18px |

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0, 0, 0, 0.05) |
| `--shadow-md` | 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04) |
| `--shadow-lg` | 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04) |

### Typography

- **Body**: 'Plus Jakarta Sans', 'Inter', -apple-system, system-ui, sans-serif
- **Heading**: 'Plus Jakarta Sans', 'Inter', -apple-system, system-ui, sans-serif

## Spatial Metaphor

**Flat — clean surfaces, no elevation effects**

## Usage

```js
// main.js or per-view <style> block
import './tools/design-themes/presets/modern-neutral/tokens.css'
```

```js
// Runtime switching via composable
import { useDesign } from './composables/useDesign'
const { applyDesign } = useDesign()
applyDesign('modern-neutral')
```
