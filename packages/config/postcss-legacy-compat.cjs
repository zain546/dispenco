/**
 * Dispenco Legacy & Universal Browser CSS Compatibility PostCSS Plugin
 *
 * Why this exists:
 * - Many pharmacy POS computers run Windows 7 / Windows 8.1 (frozen at Chrome <= 109)
 *   or older Android / iOS tablets (Safari <= 15).
 * - Tailwind CSS v4 emits modern CSS Color Level 4/5 features by default:
 *   1. `color-mix(in oklab, var(--primary) 15%, transparent)` with a fallback of
 *      `background-color: var(--primary)` (100% solid opaque!), which turns every
 *      subtle tint (`bg-primary/15`, `bg-muted/40`, `border-border/70`) into a solid
 *      opaque color block that hides text and icons on Chrome <= 110.
 *   2. Built-in Tailwind palette colors in `oklch(...)` (unsupported in Chrome <= 110).
 *   3. `linear-gradient(to right in oklab, ...)` (unsupported in Chrome <= 110).
 *   4. Individual transform properties (`translate`, `rotate`, `scale`) and logical
 *      shorthands (`padding-inline`, `inset-inline`, `margin-inline`) that fail on older engines.
 *
 * This PostCSS plugin runs after `@tailwindcss/postcss` and guarantees universal compatibility:
 * 1. Rewrites every `var(--token)` solid fallback paired with `@supports (color: color-mix(...))`
 *    into an exact translucent `rgba(var(--token-rgb), <alpha>)` fallback so opacity modifiers
 *    (`bg-primary/15`, `bg-muted/40`, `border-border/70`, etc.) render with identical transparency
 *    on every browser while preserving `color-mix(in oklab, ...)` inside `@supports` for modern browsers.
 * 2. Converts built-in Tailwind `--color-*` theme variables from `oklch(...)` to universally supported
 *    sRGB `#hex` values and converts `color-mix(in srgb, oklch(...) X%, transparent)` fallbacks to `rgba()`.
 * 3. Downlevels `--tw-gradient-position: <dir> in oklab` to standard `<dir>` with an `@supports` upgrade.
 * 4. Adds standard `transform: translate(...) / rotate(...) / scale(...)` fallbacks before individual
 *    CSS transform properties (`translate`, `rotate`, `scale`).
 * 5. Converts logical padding/margin/inset shorthands (`padding-inline`, `padding-block`, `margin-inline`,
 *    `margin-block`, `inset-inline`, `inset-block`) to physical properties (`left`/`right`, `top`/`bottom`).
 */

const THEME_VAR_TO_RGB = {
  '--background': '--background-rgb',
  '--foreground': '--foreground-rgb',
  '--card': '--card-rgb',
  '--card-foreground': '--card-foreground-rgb',
  '--popover': '--popover-rgb',
  '--popover-foreground': '--popover-foreground-rgb',
  '--surface': '--surface-rgb',
  '--surface-elevated': '--surface-elevated-rgb',
  '--primary': '--primary-rgb',
  '--primary-foreground': '--primary-foreground-rgb',
  '--secondary': '--secondary-rgb',
  '--secondary-foreground': '--secondary-foreground-rgb',
  '--muted': '--muted-rgb',
  '--muted-foreground': '--muted-foreground-rgb',
  '--accent': '--accent-rgb',
  '--accent-foreground': '--accent-foreground-rgb',
  '--destructive': '--destructive-rgb',
  '--destructive-foreground': '--destructive-foreground-rgb',
  '--success': '--success-rgb',
  '--success-foreground': '--success-foreground-rgb',
  '--warning': '--warning-rgb',
  '--warning-foreground': '--warning-foreground-rgb',
  '--border': '--border-rgb',
  '--border-subtle': '--border-subtle-rgb',
  '--input': '--input-rgb',
  '--ring': '--ring-rgb',
  '--chart-1': '--chart-1-rgb',
  '--chart-2': '--chart-2-rgb',
  '--chart-3': '--chart-3-rgb',
  '--chart-4': '--chart-4-rgb',
  '--chart-5': '--chart-5-rgb',
  '--sidebar': '--sidebar-rgb',
  '--sidebar-foreground': '--sidebar-foreground-rgb',
  '--sidebar-primary': '--sidebar-primary-rgb',
  '--sidebar-primary-foreground': '--sidebar-primary-foreground-rgb',
  '--sidebar-accent': '--sidebar-accent-rgb',
  '--sidebar-accent-foreground': '--sidebar-accent-foreground-rgb',
  '--sidebar-border': '--sidebar-border-rgb',
  '--sidebar-ring': '--sidebar-ring-rgb',
};

/**
 * Converts an OKLab color (L in [0..1], a, b) to clamped sRGB [r, g, b] (0..255).
 */
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toSrgbByte = (c) => {
    const cl = Math.max(0, Math.min(1, c));
    const gamma = cl <= 0.0031308 ? 12.92 * cl : 1.055 * Math.pow(cl, 1 / 2.4) - 0.055;
    return Math.round(gamma * 255);
  };

  return [toSrgbByte(rLin), toSrgbByte(gLin), toSrgbByte(bLin)];
}

/**
 * Converts an OKLCH color (L in [0..1], C >= 0, H in degrees [0..360]) to clamped sRGB [r, g, b] (0..255).
 */
function oklchToRgb(L, C, H) {
  const hRad = ((H || 0) * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b);
}

function parseOklabString(str) {
  const m = str.match(
    /oklab\(\s*([0-9.]+)(%?)\s+([-+]?[0-9.]+)\s+([-+]?[0-9.]+)(?:\s*\/\s*([0-9.]+)(%?))?\s*\)/i
  );
  if (!m) return null;
  const rawL = parseFloat(m[1]);
  const L = m[2] === '%' ? rawL / 100 : rawL;
  const a = parseFloat(m[3]);
  const b = parseFloat(m[4]);
  const [r, g, bl] = oklabToRgb(L, a, b);

  if (m[5] !== undefined) {
    const rawA = parseFloat(m[5]);
    const alpha = Number((m[6] === '%' ? rawA / 100 : rawA).toFixed(4));
    return { r, g, b: bl, alpha };
  }
  return { r, g, b: bl, alpha: 1 };
}

function parseOklchString(str) {
  const m = str.match(
    /oklch\(\s*([0-9.]+)(%?)\s+([0-9.]+)\s+([0-9.]+|none)(?:\s*\/\s*([0-9.]+)(%?))?\s*\)/i
  );
  if (!m) return null;
  const rawL = parseFloat(m[1]);
  const L = m[2] === '%' ? rawL / 100 : rawL;
  const C = parseFloat(m[3]);
  const H = m[4] === 'none' ? 0 : parseFloat(m[4]);
  const [r, g, b] = oklchToRgb(L, C, H);

  if (m[5] !== undefined) {
    const rawA = parseFloat(m[5]);
    const alpha = Number((m[6] === '%' ? rawA / 100 : rawA).toFixed(4));
    return { r, g, b, alpha };
  }
  return { r, g, b, alpha: 1 };
}

function formatRgbOrHex({ r, g, b, alpha }) {
  if (alpha !== undefined && alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function isInsideSupportsRule(node) {
  let cur = node.parent;
  while (cur) {
    if (cur.type === 'atrule' && cur.name === 'supports') {
      return true;
    }
    cur = cur.parent;
  }
  return false;
}

function isFeatureSupportEstablished(node, prop) {
  const propConditionRe = new RegExp(`\\(\\s*${prop}\\s*:`, 'i');
  const negatedPropRe = new RegExp(`\\bnot\\s*\\([^)]*\\b${prop}\\s*:`, 'i');
  let cur = node.parent;
  while (cur) {
    if (cur.type === 'atrule' && cur.name.toLowerCase() === 'supports') {
      const params = (cur.params || '').trim();
      if (
        propConditionRe.test(params) &&
        !negatedPropRe.test(params) &&
        !/^\s*not\b/i.test(params) &&
        !/\bor\b/i.test(params)
      ) {
        return true;
      }
    }
    cur = cur.parent;
  }
  return false;
}

function dispencoLegacyBrowserCompat() {
  return {
    postcssPlugin: 'dispenco-legacy-browser-compat',
    OnceExit(root, { postcss }) {
      // 0. Populate `--color-*-rgb` lookup for built-in Tailwind palette variables (`--color-amber-500`, etc.)
      const dynamicVarToRgb = { ...THEME_VAR_TO_RGB };
      root.walkDecls(/^--color-/, (decl) => {
        if (decl.value.includes('oklch(')) {
          const parsed = parseOklchString(decl.value);
          if (parsed) {
            const rgbVarName = `${decl.prop}-rgb`;
            dynamicVarToRgb[decl.prop] = rgbVarName;
            decl.cloneBefore({
              prop: rgbVarName,
              value: `${parsed.r}, ${parsed.g}, ${parsed.b}`,
            });
            if (!isInsideSupportsRule(decl)) {
              decl.value = formatRgbOrHex(parsed);
            }
          }
        }
      });

      // 1. Replace solid `var(--token)` fallbacks with translucent `rgba(var(--token-rgb), alpha)`
      root.walkAtRules('supports', (atRule) => {
        if (!atRule.params.includes('color-mix')) return;

        atRule.walkDecls((decl) => {
          const match = decl.value.match(
            /color-mix\(in oklab,\s*var\((--[a-z0-9-]+)\)\s*([0-9.]+)%,\s*transparent\)/
          );
          if (!match) return;

          const varName = match[1];
          const pct = parseFloat(match[2]);
          const rgbVar = dynamicVarToRgb[varName];
          if (!rgbVar || Number.isNaN(pct)) return;

          const alpha = Number((pct / 100).toFixed(4));
          const rgbaFallback = `rgba(var(${rgbVar}), ${alpha})`;
          const parent = atRule.parent;

          if (parent && parent.type === 'rule') {
            const selectors = parent.selectors || [parent.selector];
            if (selectors.length > 1) {
              const opacitySelectors = selectors.filter((s) => s.includes('\\/'));
              const baseSelectors = selectors.filter((s) => !s.includes('\\/'));
              if (opacitySelectors.length > 0 && baseSelectors.length > 0) {
                parent.selector = baseSelectors.join(', ');
                const splitRule = postcss.rule({ selector: opacitySelectors.join(', ') });
                splitRule.append(postcss.decl({ prop: decl.prop, value: rgbaFallback }));
                parent.after(splitRule);
                return;
              }
            }

            parent.walkDecls(decl.prop, (d) => {
              if (d !== decl && (d.value === `var(${varName})` || d.value.includes('color-mix('))) {
                d.value = rgbaFallback;
              }
            });
          } else if (parent) {
            const innerRule = decl.parent;
            if (innerRule && innerRule.type === 'rule') {
              let prev = atRule.prev();
              while (prev && prev.type !== 'rule') {
                prev = prev.prev();
              }
              if (prev && prev.type === 'rule') {
                const prevSelectors = prev.selectors || [prev.selector];
                if (prevSelectors.length > 1 && prevSelectors.includes(innerRule.selector)) {
                  prev.selector = prevSelectors.filter((s) => s !== innerRule.selector).join(', ');
                  const splitRule = postcss.rule({ selector: innerRule.selector });
                  splitRule.append(postcss.decl({ prop: decl.prop, value: rgbaFallback }));
                  prev.after(splitRule);
                  return;
                }
                if (prev.selector === innerRule.selector) {
                  prev.walkDecls(decl.prop, (d) => {
                    if (d.value === `var(${varName})` || d.value.includes('color-mix(')) {
                      d.value = rgbaFallback;
                    }
                  });
                }
              }
            }
          }
        });
      });

      // 2. Convert any remaining `color-mix(...)` outside `@supports` or bare `oklch(...)` / `oklab(...)`
      root.walkDecls((decl) => {
        if (isInsideSupportsRule(decl)) return;

        if (decl.value.includes('color-mix(')) {
          decl.value = decl.value.replace(
            /color-mix\(in\s+(?:oklab|srgb),\s*var\((--[a-z0-9-]+)\)\s*([0-9.]+)%,\s*transparent\)/gi,
            (full, varName, pctStr) => {
              const rgbVar = dynamicVarToRgb[varName];
              const pct = parseFloat(pctStr);
              if (rgbVar && !Number.isNaN(pct)) {
                const alpha = Number((pct / 100).toFixed(4));
                return `rgba(var(${rgbVar}), ${alpha})`;
              }
              return full;
            }
          );

          decl.value = decl.value.replace(
            /color-mix\(in\s+(?:srgb|oklab),\s*(oklch\([^)]+\)|oklab\([^)]+\))\s*([0-9.]+)%,\s*transparent\)/gi,
            (full, colStr, pctStr) => {
              const parsed = colStr.startsWith('oklch') ? parseOklchString(colStr) : parseOklabString(colStr);
              const pct = parseFloat(pctStr);
              if (!parsed || Number.isNaN(pct)) return full;
              const sourceAlpha = typeof parsed.alpha === 'number' && !Number.isNaN(parsed.alpha)
                ? Math.max(0, Math.min(1, parsed.alpha))
                : 1;
              const alpha = Number(((sourceAlpha * pct) / 100).toFixed(4));
              return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
            }
          );
        }

        if (decl.value.includes('oklch(')) {
          decl.value = decl.value.replace(/oklch\([^)]+\)/gi, (full) => {
            const parsed = parseOklchString(full);
            return parsed ? formatRgbOrHex(parsed) : full;
          });
        }

        if (decl.value.includes('oklab(')) {
          decl.value = decl.value.replace(/oklab\([^)]+\)/gi, (full) => {
            const parsed = parseOklabString(full);
            return parsed ? formatRgbOrHex(parsed) : full;
          });
        }
      });

      // 3. Fix `::placeholder` fallback for browsers without `color-mix`
      root.walkAtRules('supports', (atRule) => {
        if (!atRule.params.includes('color-mix')) return;
        atRule.walkDecls('color', (decl) => {
          if (decl.value.includes('currentcolor 50%')) {
            const parent = atRule.parent;
            if (parent && parent.type === 'rule' && parent.selector.includes('placeholder')) {
              parent.walkDecls('color', (d) => {
                if (d !== decl && d.value.toLowerCase() === 'currentcolor') {
                  d.value = 'var(--muted-foreground, #71717a)';
                }
              });
            }
          }
        });
      });

      // 4. Downlevel `--tw-gradient-position: <dir> in oklab` for Chrome <= 110
      root.walkDecls('--tw-gradient-position', (decl) => {
        if (isInsideSupportsRule(decl)) return;
        if (decl.value.endsWith(' in oklab')) {
          const baseDir = decl.value.replace(/\s+in\s+oklab$/, '');
          const rule = decl.parent;
          decl.value = baseDir;
          if (rule && rule.type === 'rule') {
            const sup = postcss.atRule({
              name: 'supports',
              params: '(background-image: linear-gradient(in oklab, red, red))',
            });
            sup.append(
              postcss.decl({
                prop: '--tw-gradient-position',
                value: `${baseDir} in oklab`,
              })
            );
            rule.append(sup);
          }
        }
      });

      // 5. Add standard `transform` fallbacks ONLY for legacy browsers without `translate`/`rotate`/`scale` (Chrome <= 103).
      // Emit `@supports not (...) { <selector> { transform: ... } }` as a sibling rule rather than nested
      // inside `rule`, so pre-CSS-nesting browsers (Chrome <= 103) apply the fallback while modern browsers
      // skip it without doubling the offset.
      const processedTransformRules = new WeakSet();
      root.walkDecls(/^(translate|rotate|scale)$/, (decl) => {
        const rule = decl.parent;
        if (!rule || rule.type !== 'rule' || processedTransformRules.has(rule)) return;
        processedTransformRules.add(rule);

        let hasTransform = false;
        const propDecls = { translate: null, rotate: null, scale: null };
        rule.each((child) => {
          if (child.type !== 'decl') return;
          if (child.prop === 'transform') {
            hasTransform = true;
          } else if (
            (child.prop === 'translate' || child.prop === 'rotate' || child.prop === 'scale') &&
            !isFeatureSupportEstablished(child, child.prop)
          ) {
            propDecls[child.prop] = child;
          }
        });
        if (hasTransform) return;

        const transformParts = [];
        const supportsConditions = [];
        let isImportant = false;
        let hasNone = false;

        if (propDecls.translate) {
          const raw = propDecls.translate.value.trim();
          const parts = raw.split(/\s+/);
          let fn = null;
          if (raw === 'none') {
            hasNone = true;
          } else if (parts.length === 2) {
            fn = `translate(${parts[0]}, ${parts[1]})`;
          } else if (parts.length === 1) {
            fn = `translate(${parts[0]})`;
          }
          if (fn || raw === 'none') {
            if (fn) transformParts.push(fn);
            supportsConditions.push('(translate: 0)');
            if (propDecls.translate.important) isImportant = true;
          }
        }

        if (propDecls.rotate) {
          const raw = propDecls.rotate.value.trim();
          const parts = raw.split(/\s+/);
          if (raw === 'none') {
            hasNone = true;
            supportsConditions.push('(rotate: 0deg)');
            if (propDecls.rotate.important) isImportant = true;
          } else if (parts.length === 1 && raw) {
            transformParts.push(`rotate(${raw})`);
            supportsConditions.push('(rotate: 0deg)');
            if (propDecls.rotate.important) isImportant = true;
          }
        }

        if (propDecls.scale) {
          const raw = propDecls.scale.value.trim();
          const parts = raw.split(/\s+/);
          let fn = null;
          if (raw === 'none') {
            hasNone = true;
          } else if (parts.length === 2) {
            fn = `scale(${parts[0]}, ${parts[1]})`;
          } else if (parts.length === 1) {
            fn = `scale(${parts[0]})`;
          }
          if (fn || raw === 'none') {
            if (fn) transformParts.push(fn);
            supportsConditions.push('(scale: 1)');
            if (propDecls.scale.important) isImportant = true;
          }
        }

        const transformValue =
          transformParts.length > 0 ? transformParts.join(' ') : hasNone ? 'none' : null;

        if (transformValue && supportsConditions.length > 0) {
          const params =
            supportsConditions.length === 1
              ? `not ${supportsConditions[0]}`
              : `not (${supportsConditions.join(' and ')})`;
          const fallbackRule = postcss.rule({ selector: rule.selector });
          fallbackRule.append(
            postcss.decl({
              prop: 'transform',
              value: transformValue,
              important: isImportant,
            })
          );
          const sup = postcss.atRule({
            name: 'supports',
            params,
          });
          sup.append(fallbackRule);
          rule.after(sup);
        }
      });

      // 6. Convert logical padding/margin/inset shorthands (`padding-inline`, `padding-block`, `margin-inline`, `margin-block`, `inset-inline`, `inset-block`)
      // to physical properties (`padding-left`/`right`, `padding-top`/`bottom`, `left`/`right`, `top`/`bottom`)
      root.walkDecls(/^(padding|margin|inset)-(inline|block)$/, (decl) => {
        const val = decl.value;
        if (decl.prop === 'inset-inline') {
          decl.cloneBefore({ prop: 'left', value: val });
          decl.cloneBefore({ prop: 'right', value: val });
        } else if (decl.prop === 'inset-block') {
          decl.cloneBefore({ prop: 'top', value: val });
          decl.cloneBefore({ prop: 'bottom', value: val });
        } else {
          const isPadding = decl.prop.startsWith('padding');
          const isInline = decl.prop.endsWith('inline');
          const prefix = isPadding ? 'padding' : 'margin';
          if (isInline) {
            decl.cloneBefore({ prop: `${prefix}-left`, value: val });
            decl.cloneBefore({ prop: `${prefix}-right`, value: val });
          } else {
            decl.cloneBefore({ prop: `${prefix}-top`, value: val });
            decl.cloneBefore({ prop: `${prefix}-bottom`, value: val });
          }
        }
        decl.remove();
      });
    },
  };
}

dispencoLegacyBrowserCompat.postcss = true;

module.exports = dispencoLegacyBrowserCompat;
