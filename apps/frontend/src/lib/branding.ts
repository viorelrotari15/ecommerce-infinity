import brandingConfig from '@/config/branding.json';

type Palette = typeof brandingConfig.palette;

export type BrandingConfig = typeof brandingConfig;

const fallbackPalette: Palette = brandingConfig.palette;

const normalizeHex = (hex: string) => {
  const value = hex.replace('#', '').trim();
  if (value.length === 3) {
    return value
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  return value;
};

const hexToHsl = (hex: string) => {
  const value = normalizeHex(hex);
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const hValue = Math.round(h);
  const sValue = Math.round(s * 100);
  const lValue = Math.round(l * 100);

  return `${hValue} ${sValue}% ${lValue}%`;
};

const withFallbacks = (palette: Partial<Palette>): Palette => ({
  ...fallbackPalette,
  ...palette,
});

export const getBranding = () => {
  const palette = withFallbacks(brandingConfig.palette);

  return {
    ...brandingConfig,
    palette,
    cssVars: {
      '--primary': hexToHsl(palette.primary),
      '--primary-foreground': hexToHsl(palette.primaryForeground),
      '--secondary': hexToHsl(palette.secondary),
      '--secondary-foreground': hexToHsl(palette.secondaryForeground),
      '--accent': hexToHsl(palette.accent),
      '--accent-foreground': hexToHsl(palette.accentForeground),
      '--background': hexToHsl(palette.background),
      '--foreground': hexToHsl(palette.foreground),
      '--card': hexToHsl(palette.card),
      '--card-foreground': hexToHsl(palette.cardForeground),
      '--popover': hexToHsl(palette.popover),
      '--popover-foreground': hexToHsl(palette.popoverForeground),
      '--muted': hexToHsl(palette.muted),
      '--muted-foreground': hexToHsl(palette.mutedForeground),
      '--border': hexToHsl(palette.border),
      '--input': hexToHsl(palette.input),
      '--ring': hexToHsl(palette.ring),
      '--destructive': hexToHsl(palette.destructive),
      '--destructive-foreground': hexToHsl(palette.destructiveForeground),
    },
  };
};
