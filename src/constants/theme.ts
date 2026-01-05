import { Platform } from 'react-native';

const palette = {
  // Brand
  primary: '#6366F1', // Indigo 500
  primaryDark: '#4F46E5', // Indigo 600
  primaryLight: '#818CF8', // Indigo 400

  // Semantic
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444', // Red 500
  info: '#3B82F6', // Blue 500

  // Dark Theme (Premium)
  darkBackground: '#000000ff', // Zinc 950
  darkSurface: '#121214ff', // Zinc 900
  darkSurfaceHighlight: '#27272A', // Zinc 800
  darkText: '#FAFAFA', // Zinc 50
  darkTextSecondary: '#A1A1AA', // Zinc 400
  darkBorder: '#27272A', // Zinc 800

  // Light Theme (Clean)
  lightBackground: '#FFFFFF',
  lightSurface: '#F4F4F5', // Zinc 100
  lightSurfaceHighlight: '#E4E4E7', // Zinc 200
  lightText: '#18181B', // Zinc 900
  lightTextSecondary: '#71717A', // Zinc 500
  lightBorder: '#E4E4E7', // Zinc 200
};

export const Colors = {
  light: {
    text: palette.lightText,
    textSecondary: palette.lightTextSecondary,
    background: palette.lightBackground,
    surface: palette.lightSurface,
    surfaceHighlight: palette.lightSurfaceHighlight,
    tint: palette.primary,
    icon: palette.lightTextSecondary,
    tabIconDefault: palette.lightTextSecondary,
    tabIconSelected: palette.primary,
    border: palette.lightBorder,
    error: palette.danger,
    success: palette.success,
    gradients: {
      primary: [palette.primary, palette.primaryDark] as const,
      surface: ['#FFFFFF', '#F4F4F5'] as const,
    }
  },
  dark: {
    text: palette.darkText,
    textSecondary: palette.darkTextSecondary,
    background: palette.darkBackground,
    surface: palette.darkSurface,
    surfaceHighlight: palette.darkSurfaceHighlight,
    tint: palette.primaryLight,
    icon: palette.darkTextSecondary,
    tabIconDefault: palette.darkTextSecondary,
    tabIconSelected: palette.primaryLight,
    border: palette.darkBorder,
    error: palette.danger,
    success: palette.success,
    gradients: {
      primary: [palette.primary, palette.primaryDark] as const,
      surface: [palette.darkSurface, palette.darkSurfaceHighlight] as const,
    }
  },
  palette, // Export raw palette if needed
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
});
