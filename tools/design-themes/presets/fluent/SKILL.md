---
name: fluent
description: Fluent Design (Windows 11) — open, friendly, efficient. Soft gray base + white cards + blue accents.
---

# fluent

Fluent Design (Windows 11) — open, friendly, efficient. Soft gray base + white cards + blue accents.

## Design Philosophy

- **Mode**: Light-first
- **Spatial metaphor**: Card Elevation — white cards float above gray backgrounds

## Token Reference

### Colors

| Token | Value |
|-------|-------|
| `--color-blue` | #005fb8 |
| `--color-red` | #c42b1c |
| `--color-green` | #0b6a0b |
| `--color-purple` | #8661c5 |
| `--color-orange` | #e67e22 |
| `--color-cyan` | #0099bc |

### Labels

| Token | Value |
|-------|-------|
| `--label-primary` | #1a1a1a |
| `--label-secondary` | #616161 |
| `--label-tertiary` | #9e9e9e |
| `--label-quaternary` | #bdbdbd |

### Backgrounds

| Token | Value |
|-------|-------|
| `--bg-primary` | #f0f0f0 |
| `--bg-secondary` | #ffffff |
| `--bg-tertiary` | #fafafa |

### Radius

| Token | Value |
|-------|-------|
| `--radius-xs` | 2px |
| `--radius-sm` | 4px |
| `--radius-md` | 7px |
| `--radius-lg` | 10px |
| `--radius-xl` | 14px |

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0, 0, 0, 0.06) |
| `--shadow-md` | 0 2px 8px rgba(0, 0, 0, 0.08) |
| `--shadow-lg` | 0 4px 16px rgba(0, 0, 0, 0.10) |

### Typography

- **Body**: 'Plus Jakarta Sans', -apple-system, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif
- **Heading**: 'Plus Jakarta Sans', -apple-system, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif

## Spatial Metaphor

**Card Elevation — white cards float above gray backgrounds**

### Global Classes

- `.page-header` — Elevated card header container
- `.content-card` — Content card with padding

## Usage

```js
// main.js or per-view <style> block
import './tools/design-themes/presets/fluent/tokens.css'
import './tools/design-themes/presets/fluent/style.css'
```

```js
// Runtime switching via composable
import { useDesign } from './composables/useDesign'
const { applyDesign } = useDesign()
applyDesign('fluent')
```
