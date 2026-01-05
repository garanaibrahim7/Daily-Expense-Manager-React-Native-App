/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function useThemeColor<
  ColorName extends keyof typeof Colors.light & keyof typeof Colors.dark
>(
  props: { light?: string; dark?: string },
  colorName: ColorName
) {
  const { theme } = useTheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
