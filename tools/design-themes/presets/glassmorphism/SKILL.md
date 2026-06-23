---
name: glassmorphism
description: Dark space background + frosted glass surfaces + luminous accents.
---

# glassmorphism

Dark space background + frosted glass surfaces + luminous accents.

## Design Philosophy

- **Mode**: Dark-first
- **Spatial metaphor**: Ambient Glow — luminous blobs + frosted glass overlays
- **Typography**: Distinct heading font ('Playfair Display')

## Token Reference

### Colors

| Token | Value |
|-------|-------|
| `--color-blue` | #60a5fa |
| `--color-red` | #f87171 |
| `--color-green` | #4ade80 |
| `--color-purple` | #a78bfa |
| `--color-orange` | #fb923c |
| `--color-cyan` | #22d3ee |

### Labels

| Token | Value |
|-------|-------|
| `--label-primary` | rgba(255, 255, 255, 0.95) |
| `--label-secondary` | rgba(255, 255, 255, 0.6) |
| `--label-tertiary` | rgba(255, 255, 255, 0.35) |
| `--label-quaternary` | rgba(255, 255, 255, 0.18) |

### Backgrounds

| Token | Value |
|-------|-------|
| `--bg-primary` | #0a0e27 |
| `--bg-secondary` | rgba(255, 255, 255, 0.05) |
| `--bg-tertiary` | rgba(255, 255, 255, 0.03) |

### Radius

| Token | Value |
|-------|-------|
| `--radius-xs` | 4px |
| `--radius-sm` | 12px |
| `--radius-md` | 16px |
| `--radius-lg` | 20px |
| `--radius-xl` | 24px |

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0, 0, 0, 0.3) |
| `--shadow-md` | 0 4px 12px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2) |
| `--shadow-lg` | 0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.2) |

### Typography

- **Body**: 'Plus Jakarta Sans', -apple-system, system-ui, sans-serif
- **Heading**: 'Playfair Display', Georgia, 'Times New Roman', serif

## Spatial Metaphor

**Ambient Glow — luminous blobs + frosted glass overlays**

### Global Classes

- `.ambient` — Fixed overlay container for light blobs
- `.blob`, `.blob--1/2/3` — Positioned color blobs with blur
- `.glass-surface` — Translucent backdrop-blur surface
- `.glass-card` — Rounded glass card container

## Usage

```js
// main.js or per-view <style> block
import './tools/design-themes/presets/glassmorphism/tokens.css'
import './tools/design-themes/presets/glassmorphism/style.css'
```

```js
// Runtime switching via composable
import { useDesign } from './composables/useDesign'
const { applyDesign } = useDesign()
applyDesign('glassmorphism')
```
