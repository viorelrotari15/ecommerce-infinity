// Shared UI theme configuration
// This package can be extended with shared theme tokens and utilities

export const themeConfig = {
  // Brand colors (can be overridden)
  colors: {
    primary: 'hsl(220, 14%, 96%)',
    secondary: 'hsl(210, 40%, 96%)',
    accent: 'hsl(210, 40%, 96%)',
  },
  // Typography
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['Menlo', 'monospace'],
  },
  // Spacing scale
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  // Border radius
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
};

// Rebranding helper function
export function generateThemeOverrides(overrides: {
  primary?: string;
  secondary?: string;
  accent?: string;
  fontFamily?: string;
}) {
  return {
    ...themeConfig,
    colors: {
      ...themeConfig.colors,
      ...overrides,
    },
    fonts: {
      ...themeConfig.fonts,
      ...(overrides.fontFamily && { sans: [overrides.fontFamily, ...themeConfig.fonts.sans] }),
    },
  };
}

