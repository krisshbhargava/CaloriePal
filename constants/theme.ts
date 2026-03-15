/**
 * App color scheme and typography.
 * Primary: #ffbb39, Accent: #083c5d, Text: #1d2731, Background: white.
 */

import { Platform } from 'react-native';

const primary = '#ffbb39';
const accent = '#083c5d';
const textPrimary = '#1d2731';
const white = '#ffffff';

export const Colors = {
  light: {
    text: textPrimary,
    background: white,
    primary,
    accent,
    card: white,
    cardBorder: '#e8eaed',
    surface: '#f5f6f8',
    tint: primary,
    icon: textPrimary,
    tabIconDefault: '#6b7280',
    tabIconSelected: primary,
    link: accent,
  },
  dark: {
    text: '#e8eaed',
    background: '#111318',
    primary,
    accent: '#5b9fd4',
    card: '#1d2731',
    cardBorder: '#2d3748',
    surface: '#1d2731',
    tint: primary,
    icon: '#e8eaed',
    tabIconDefault: '#9ca3af',
    tabIconSelected: primary,
    link: '#5b9fd4',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Max content width for centered, readable layout on large screens */
export const Layout = {
  maxContentWidth: 480,
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 20,
};
