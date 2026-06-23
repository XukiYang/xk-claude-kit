#!/usr/bin/env node

/**
 * Design Spec Compiler
 * Reads design-spec.json → generates tokens.css + style.css + SKILL.md
 *
 * Usage: node tools/design-themes/compiler/compile.cjs <design-spec.json>
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function parseColor(color) {
  if (!color || typeof color !== 'string') return null;

  // Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  const hex = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  // rgba()
  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgba) {
    return {
      r: parseInt(rgba[1], 10),
      g: parseInt(rgba[2], 10),
      b: parseInt(rgba[3], 10),
      a: rgba[4] !== undefined ? parseFloat(rgba[4]) : 1,
    };
  }

  return null;
}

function formatColor(r, g, b, a) {
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));
  if (a !== undefined) a = Math.max(0, Math.min(1, a));
  if (a !== undefined && a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(3))})`;
  }
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function adjustColor(color, { lighten = 0, darken = 0, alpha }) {
  const c = parseColor(color);
  if (!c) return color;

  let { r, g, b, a } = c;
  if (lighten > 0) {
    r += (255 - r) * lighten;
    g += (255 - g) * lighten;
    b += (255 - b) * lighten;
  }
  if (darken > 0) {
    r *= 1 - darken;
    g *= 1 - darken;
    b *= 1 - darken;
  }
  if (alpha !== undefined) a = alpha;
  return formatColor(r, g, b, a);
}

// ---------------------------------------------------------------------------
// Dark mode auto-derivation (luminance-aware)
// ---------------------------------------------------------------------------

function deriveDarkTokens(spec) {
  const dark = {};

  // Colors: luminance-aware lighten
  if (spec.colors) {
    dark.colors = {};
    for (const [key, val] of Object.entries(spec.colors)) {
      const c = parseColor(val);
      if (c) {
        const lum = luminance(c.r, c.g, c.b);
        // Already-light colors: darken slightly instead of washing out
        if (lum > 0.5) {
          dark.colors[key] = adjustColor(val, { darken: 0.15 });
        } else {
          dark.colors[key] = adjustColor(val, { lighten: 0.3 });
        }
      } else {
        dark.colors[key] = val;
      }
    }
  }

  // Labels: white-based hierarchy
  dark.labels = {
    primary: 'rgba(245, 245, 247, 0.95)',
    secondary: 'rgba(235, 235, 245, 0.6)',
    tertiary: 'rgba(235, 235, 245, 0.3)',
    quaternary: 'rgba(235, 235, 245, 0.18)',
  };

  // Backgrounds: dark surfaces
  dark.backgrounds = {
    primary: '#000000',
    secondary: '#1c1c1e',
    tertiary: '#2c2c2e',
  };

  // Fills: slightly stronger for dark
  dark.fills = {
    primary: 'rgba(120, 120, 128, 0.36)',
    secondary: 'rgba(120, 120, 128, 0.32)',
    tertiary: 'rgba(118, 118, 128, 0.24)',
    quaternary: 'rgba(118, 118, 128, 0.18)',
  };

  // Shadows: heavier for dark
  dark.shadows = {
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 2px 4px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.2)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.15), 0 16px 32px rgba(0, 0, 0, 0.25), 0 32px 64px rgba(0, 0, 0, 0.15)',
  };

  return dark;
}

function mergeDeep(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// CSS generation: tokens.css
// ---------------------------------------------------------------------------

function generateTokensCSS(spec) {
  const lines = [];
  const push = (indent, text) => lines.push('  '.repeat(indent) + text);

  // Sanitize description for CSS comment
  const safeDesc = (spec.description || '').replace(/\*\//g, '* /');

  lines.push(`/* ==========================================================================`);
  lines.push(`   ${spec.name} — Design Tokens (compiled)`);
  lines.push(`   ${safeDesc}`);
  lines.push(`   ========================================================================== */`);
  lines.push('');
  lines.push(':root {');

  // Colors
  if (spec.colors) {
    push(1, '/* -- Colors */');
    for (const [key, val] of Object.entries(spec.colors)) {
      push(1, `--color-${key}: ${val};`);
    }
    lines.push('');
  }

  // Labels
  push(1, '/* -- Labels */');
  for (const [key, val] of Object.entries(spec.labels)) {
    push(1, `--label-${key}: ${val};`);
  }
  lines.push('');

  // Backgrounds
  push(1, '/* -- Backgrounds */');
  const bgMap = {
    primary: '--bg-primary',
    secondary: '--bg-secondary',
    tertiary: '--bg-tertiary',
  };
  for (const [key, val] of Object.entries(spec.backgrounds)) {
    if (bgMap[key]) push(1, `${bgMap[key]}: ${val};`);
  }
  push(1, `--bg-grouped-primary: ${spec.backgrounds.primary};`);
  push(1, `--bg-grouped-secondary: ${spec.backgrounds.secondary};`);
  push(1, `--bg-grouped-tertiary: ${spec.backgrounds.tertiary || spec.backgrounds.primary};`);
  lines.push('');

  // Fills
  if (spec.fills) {
    push(1, '/* -- Fills */');
    for (const [key, val] of Object.entries(spec.fills)) {
      push(1, `--fill-${key}: ${val};`);
    }
    lines.push('');
  }

  // Separators
  push(1, '/* -- Separators */');
  if (spec.mode === 'dark') {
    push(1, `--separator: rgba(255, 255, 255, 0.08);`);
    push(1, `--separator-opaque: rgba(255, 255, 255, 0.1);`);
  } else {
    const labelC = parseColor(spec.labels.primary) || { r: 24, g: 24, b: 27 };
    push(1, `--separator: rgba(${labelC.r}, ${labelC.g}, ${labelC.b}, 0.08);`);
    push(1, `--separator-opaque: ${adjustColor(spec.labels.primary, { lighten: 0.85 })};`);
  }
  lines.push('');

  // Grays (if provided)
  if (spec.grays) {
    push(1, '/* -- Grays */');
    for (const [key, val] of Object.entries(spec.grays)) {
      push(1, `--${key}: ${val};`);
    }
    lines.push('');
  }

  // Radius
  push(1, '/* -- Radius */');
  const r = spec.radius;
  push(1, `--radius-xs: ${r.xs};`);
  push(1, `--radius-sm: ${r.sm || r.xs};`);
  push(1, `--radius-md: ${r.md || r.sm || r.xs};`);
  push(1, `--radius-lg: ${r.lg};`);
  push(1, `--radius-xl: ${r.xl || r.lg};`);
  // Derive 2xl: parse numeric part, add 4
  const xlVal = r.xl || r.lg;
  const xlNum = parseFloat(xlVal);
  if (!isNaN(xlNum)) {
    const unit = String(xlVal).replace(/[\d.]/g, '') || 'px';
    push(1, `--radius-2xl: ${(xlNum + 4).toFixed(1).replace(/\.0$/, '')}${unit};`);
  } else {
    push(1, `--radius-2xl: ${xlVal};`);
  }
  push(1, `--radius-full: 9999px;`);
  lines.push('');

  // Shadows
  push(1, '/* -- Shadows */');
  const s = spec.shadows;
  push(1, `--shadow-sm: ${s.sm};`);
  push(1, `--shadow-md: ${s.md || s.sm};`);
  push(1, `--shadow-lg: ${s.lg || s.md || s.sm};`);
  push(1, `--shadow-thumb: ${s.thumb || s.sm};`);
  lines.push('');

  // Typography
  push(1, '/* -- Typography */');
  push(1, `--font-family: ${spec.typography.body};`);
  push(1, `--font-heading: ${spec.typography.heading || spec.typography.body};`);
  if (spec.typographyScale) {
    const ts = spec.typographyScale;
    if (ts.sizes) {
      for (const [key, val] of Object.entries(ts.sizes)) {
        push(1, `--text-${key}: ${val};`);
      }
    }
    if (ts.lineHeights) {
      for (const [key, val] of Object.entries(ts.lineHeights)) {
        push(1, `--lh-${key}: ${val};`);
      }
    }
    if (ts.letterSpacing) {
      for (const [key, val] of Object.entries(ts.letterSpacing)) {
        push(1, `--ls-${key}: ${val};`);
      }
    }
    if (ts.weights) {
      for (const [key, val] of Object.entries(ts.weights)) {
        push(1, `--weight-${key}: ${val};`);
      }
    }
  }
  lines.push('');

  // Spacing (if provided)
  if (spec.spacing) {
    push(1, '/* -- Spacing */');
    for (const [key, val] of Object.entries(spec.spacing)) {
      push(1, `--space-${key}: ${val};`);
    }
    lines.push('');
  }

  // Motion (if provided)
  if (spec.motion) {
    push(1, '/* -- Motion */');
    if (spec.motion.durations) {
      for (const [key, val] of Object.entries(spec.motion.durations)) {
        push(1, `--duration-${key}: ${val};`);
      }
    }
    if (spec.motion.easings) {
      for (const [key, val] of Object.entries(spec.motion.easings)) {
        push(1, `--ease-${key}: ${val};`);
      }
    }
    lines.push('');
  }

  // Opacity (if provided)
  if (spec.opacity) {
    push(1, '/* -- Opacity */');
    for (const [key, val] of Object.entries(spec.opacity)) {
      push(1, `--opacity-${key}: ${val};`);
    }
    lines.push('');
  }

  // Focus ring
  push(1, '/* -- Focus ring */');
  const focusColor = spec.focusRing || spec.colors?.blue || '#3b82f6';
  push(1, `--focus-ring: inset 0 0 0 2px ${focusColor};`);
  lines.push('');

  // Component sizes (if provided)
  if (spec.componentSizes) {
    push(1, '/* -- Component sizes */');
    const sizeMap = {
      btnHeightSm: '--btn-height-sm',
      btnHeightMd: '--btn-height-md',
      btnHeightLg: '--btn-height-lg',
      toggleWidth: '--toggle-width',
      toggleHeight: '--toggle-height',
      toggleThumb: '--toggle-thumb',
    };
    for (const [key, cssVar] of Object.entries(sizeMap)) {
      if (spec.componentSizes[key]) {
        push(1, `${cssVar}: ${spec.componentSizes[key]};`);
      }
    }
    lines.push('');
  }

  // Component backgrounds (light mode)
  push(1, '/* -- Component backgrounds */');
  if (spec.mode === 'dark') {
    push(1, `--tabbar-bg: rgba(28, 28, 30, 0.92);`);
    push(1, `--toolbar-bg: rgba(28, 28, 30, 0.92);`);
    push(1, `--pill-indicator-bg-dark: rgba(255, 255, 255, 0.12);`);
    push(1, `--pill-indicator-bg-dark-alt: rgba(255, 255, 255, 0.18);`);
    push(1, `--backdrop-bg: rgba(0, 0, 0, 0.5);`);
    push(1, `--skeleton-shimmer: rgba(255, 255, 255, 0.08);`);
  } else {
    push(1, `--tabbar-bg: rgba(255, 255, 255, 0.92);`);
    push(1, `--toolbar-bg: rgba(255, 255, 255, 0.92);`);
    push(1, `--pill-indicator-bg-dark: rgba(0, 0, 0, 0.05);`);
    push(1, `--pill-indicator-bg-dark-alt: rgba(0, 0, 0, 0.08);`);
    push(1, `--backdrop-bg: rgba(0, 0, 0, 0.4);`);
    push(1, `--skeleton-shimmer: rgba(255, 255, 255, 0.3);`);
  }
  lines.push('');

  lines.push('}');

  // Dark mode block
  if (spec.mode === 'light') {
    const dark = spec.darkOverrides ? mergeDeep(deriveDarkTokens(spec), spec.darkOverrides) : deriveDarkTokens(spec);
    lines.push('');
    lines.push(`/* -- Dark mode (auto-derived) ------------------------------------------- */`);
    lines.push(':root[data-theme="dark"] {');

    if (dark.colors) {
      push(1, '/* -- Colors */');
      for (const [key, val] of Object.entries(dark.colors)) {
        push(1, `--color-${key}: ${val};`);
      }
      lines.push('');
    }

    push(1, '/* -- Labels */');
    for (const [key, val] of Object.entries(dark.labels)) {
      push(1, `--label-${key}: ${val};`);
    }
    lines.push('');

    push(1, '/* -- Backgrounds */');
    push(1, `--bg-primary: ${dark.backgrounds.primary};`);
    push(1, `--bg-secondary: ${dark.backgrounds.secondary};`);
    push(1, `--bg-tertiary: ${dark.backgrounds.tertiary};`);
    push(1, `--bg-grouped-primary: ${dark.backgrounds.primary};`);
    push(1, `--bg-grouped-secondary: ${dark.backgrounds.secondary};`);
    push(1, `--bg-grouped-tertiary: ${dark.backgrounds.tertiary};`);
    lines.push('');

    push(1, '/* -- Fills */');
    for (const [key, val] of Object.entries(dark.fills)) {
      push(1, `--fill-${key}: ${val};`);
    }
    lines.push('');

    push(1, '/* -- Separators */');
    push(1, `--separator: rgba(84, 84, 88, 0.65);`);
    push(1, `--separator-opaque: #38383a;`);
    lines.push('');

    push(1, '/* -- Shadows */');
    for (const [key, val] of Object.entries(dark.shadows)) {
      push(1, `--shadow-${key}: ${val};`);
    }
    push(1, `--shadow-thumb: 0 2px 4px rgba(0, 0, 0, 0.4);`);
    lines.push('');

    // Component sizes (preserve in dark mode)
    if (spec.componentSizes) {
      push(1, '/* -- Component sizes */');
      const sizeMap = {
        btnHeightSm: '--btn-height-sm',
        btnHeightMd: '--btn-height-md',
        btnHeightLg: '--btn-height-lg',
        toggleWidth: '--toggle-width',
        toggleHeight: '--toggle-height',
        toggleThumb: '--toggle-thumb',
      };
      for (const [key, cssVar] of Object.entries(sizeMap)) {
        if (spec.componentSizes[key]) {
          push(1, `${cssVar}: ${spec.componentSizes[key]};`);
        }
      }
      lines.push('');
    }

    push(1, '/* -- Component backgrounds */');
    push(1, `--tabbar-bg: rgba(28, 28, 30, 0.92);`);
    push(1, `--toolbar-bg: rgba(28, 28, 30, 0.92);`);
    push(1, `--pill-indicator-bg-dark: rgba(255, 255, 255, 0.12);`);
    push(1, `--pill-indicator-bg-dark-alt: rgba(255, 255, 255, 0.18);`);
    push(1, `--backdrop-bg: rgba(0, 0, 0, 0.5);`);
    push(1, `--skeleton-shimmer: rgba(255, 255, 255, 0.08);`);

    lines.push('}');
  }

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CSS generation: style.css
// ---------------------------------------------------------------------------

function generateStyleCSS(spec) {
  const metaphor = spec.spatialMetaphor || 'flat';

  const templates = {
    flat: `/* ${spec.name} — No extra global styles (flat metaphor) */\n`,

    'card-elevation': `/* ${spec.name} — Card elevation utilities */

.page-header {
  padding: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.content-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}
`,

    'frosted-glass': `/* ${spec.name} — Frosted glass surface utilities */

.glass-surface {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
}
`,

    'ambient-glow': `/* ${spec.name} — Ambient glow + frosted glass */

/* -- Ambient light blobs --------------------------------------------------- */
.ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.blob--1 {
  width: 400px;
  height: 400px;
  top: -100px;
  left: -100px;
  background: radial-gradient(circle, var(--color-blue, #3b82f6), transparent 70%);
}

.blob--2 {
  width: 350px;
  height: 350px;
  top: 40%;
  right: -80px;
  background: radial-gradient(circle, var(--color-purple, #8b5cf6), transparent 70%);
}

.blob--3 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: 30%;
  background: radial-gradient(circle, var(--color-cyan, #06b6d4), transparent 70%);
}

/* -- Frosted glass surfaces ------------------------------------------------ */
.glass-surface {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
}
`,

    custom: spec.customStyleCSS || `/* ${spec.name} — Custom style (no template) */\n`,
  };

  return templates[metaphor] || templates.flat;
}

// ---------------------------------------------------------------------------
// Markdown generation: SKILL.md
// ---------------------------------------------------------------------------

function generateSkillMD(spec) {
  const metaphor = spec.spatialMetaphor || 'flat';
  const metaphorLabels = {
    flat: 'Flat — clean surfaces, no elevation effects',
    'card-elevation': 'Card Elevation — white cards float above gray backgrounds',
    'frosted-glass': 'Frosted Glass — translucent surfaces with backdrop blur',
    'ambient-glow': 'Ambient Glow — luminous blobs + frosted glass overlays',
  };

  const lines = [];

  // Frontmatter
  lines.push('---');
  lines.push(`name: ${spec.name}`);
  lines.push(`description: ${spec.description || spec.name}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${spec.name}`);
  lines.push('');
  lines.push(spec.description || '');
  lines.push('');

  // Design philosophy
  lines.push('## Design Philosophy');
  lines.push('');
  lines.push(`- **Mode**: ${spec.mode === 'dark' ? 'Dark-first' : 'Light-first'}`);
  lines.push(`- **Spatial metaphor**: ${metaphorLabels[metaphor] || metaphor}`);
  const heading = spec.typography.heading || spec.typography.body;
  if (heading !== spec.typography.body) {
    lines.push(`- **Typography**: Distinct heading font (${heading.split(',')[0].trim()})`);
  }
  lines.push('');

  // Token reference
  lines.push('## Token Reference');
  lines.push('');

  // Colors
  if (spec.colors) {
    lines.push('### Colors');
    lines.push('');
    lines.push('| Token | Value |');
    lines.push('|-------|-------|');
    for (const [key, val] of Object.entries(spec.colors)) {
      lines.push(`| \`--color-${key}\` | ${val} |`);
    }
    lines.push('');
  }

  // Labels
  lines.push('### Labels');
  lines.push('');
  lines.push('| Token | Value |');
  lines.push('|-------|-------|');
  for (const [key, val] of Object.entries(spec.labels)) {
    lines.push(`| \`--label-${key}\` | ${val} |`);
  }
  lines.push('');

  // Backgrounds
  lines.push('### Backgrounds');
  lines.push('');
  lines.push('| Token | Value |');
  lines.push('|-------|-------|');
  for (const [key, val] of Object.entries(spec.backgrounds)) {
    lines.push(`| \`--bg-${key}\` | ${val} |`);
  }
  lines.push('');

  // Radius
  lines.push('### Radius');
  lines.push('');
  lines.push('| Token | Value |');
  lines.push('|-------|-------|');
  for (const [key, val] of Object.entries(spec.radius)) {
    lines.push(`| \`--radius-${key}\` | ${val} |`);
  }
  lines.push('');

  // Shadows
  lines.push('### Shadows');
  lines.push('');
  lines.push('| Token | Value |');
  lines.push('|-------|-------|');
  for (const [key, val] of Object.entries(spec.shadows)) {
    lines.push(`| \`--shadow-${key}\` | ${val} |`);
  }
  lines.push('');

  // Typography
  lines.push('### Typography');
  lines.push('');
  lines.push(`- **Body**: ${spec.typography.body}`);
  lines.push(`- **Heading**: ${heading}`);
  lines.push('');

  // Spatial metaphor section
  lines.push('## Spatial Metaphor');
  lines.push('');
  lines.push(`**${metaphorLabels[metaphor] || metaphor}**`);
  lines.push('');

  if (metaphor === 'ambient-glow') {
    lines.push('### Global Classes');
    lines.push('');
    lines.push('- `.ambient` — Fixed overlay container for light blobs');
    lines.push('- `.blob`, `.blob--1/2/3` — Positioned color blobs with blur');
    lines.push('- `.glass-surface` — Translucent backdrop-blur surface');
    lines.push('- `.glass-card` — Rounded glass card container');
    lines.push('');
  } else if (metaphor === 'frosted-glass') {
    lines.push('### Global Classes');
    lines.push('');
    lines.push('- `.glass-surface` — Translucent backdrop-blur surface');
    lines.push('- `.glass-card` — Rounded glass card container');
    lines.push('');
  } else if (metaphor === 'card-elevation') {
    lines.push('### Global Classes');
    lines.push('');
    lines.push('- `.page-header` — Elevated card header container');
    lines.push('- `.content-card` — Content card with padding');
    lines.push('');
  }

  // Usage
  lines.push('## Usage');
  lines.push('');
  lines.push('```js');
  lines.push(`// main.js or per-view <style> block`);
  lines.push(`import './tools/design-themes/presets/${spec.name}/tokens.css'`);
  if (metaphor !== 'flat') {
    lines.push(`import './tools/design-themes/presets/${spec.name}/style.css'`);
  }
  lines.push('```');
  lines.push('');

  // Or via useDesign composable
  lines.push('```js');
  lines.push(`// Runtime switching via composable`);
  lines.push(`import { useDesign } from './composables/useDesign'`);
  lines.push(`const { applyDesign } = useDesign()`);
  lines.push(`applyDesign('${spec.name}')`);
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function compile(specPath) {
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to parse ${specPath}: ${err.message}`);
    process.exit(1);
  }

  const outDir = path.dirname(specPath);

  // Validate required fields
  const required = ['name', 'labels', 'backgrounds', 'radius', 'shadows', 'typography', 'spatialMetaphor'];
  for (const field of required) {
    if (!spec[field]) {
      console.error(`Missing required field: ${field}`);
      process.exit(1);
    }
  }

  // Default mode to 'light'
  if (!spec.mode) spec.mode = 'light';

  // Generate
  const tokensCSS = generateTokensCSS(spec);
  const styleCSS = generateStyleCSS(spec);
  const skillMD = generateSkillMD(spec);

  // Write
  fs.writeFileSync(path.join(outDir, 'tokens.css'), tokensCSS);
  fs.writeFileSync(path.join(outDir, 'style.css'), styleCSS);
  fs.writeFileSync(path.join(outDir, 'SKILL.md'), skillMD);

  console.log(`Compiled: ${spec.name}`);
  console.log(`  → ${path.join(outDir, 'tokens.css')}`);
  console.log(`  → ${path.join(outDir, 'style.css')}`);
  console.log(`  → ${path.join(outDir, 'SKILL.md')}`);
}

// Run
const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: node tools/design-themes/compiler/compile.cjs <design-spec.json>');
  process.exit(1);
}
compile(path.resolve(specPath));
