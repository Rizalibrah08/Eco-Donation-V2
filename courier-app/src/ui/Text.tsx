import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, fonts, typography } from './theme';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'subtle' | 'primary' | 'success' | 'warning' | 'danger' | 'inverse';

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  inverse: '#FFFFFF',
};

type Weight = '400' | '500' | '600' | '700' | '800';

// Font kustom: ketebalan dipilih lewat keluarga font, bukan fontWeight.
const weightFamily: Record<Weight, string> = {
  '400': fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  '700': fonts.semibold,
  '800': fonts.bold,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: Weight;
  align?: 'left' | 'center' | 'right';
  /** Angka sejajar per digit (saldo, berat, poin). */
  tabular?: boolean;
}

export function Text({ variant = 'body', tone = 'default', weight, align, tabular, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: toneColor[tone] },
        weight ? { fontFamily: weightFamily[weight] } : null,
        align ? { textAlign: align } : null,
        tabular ? textStyles.tabular : null,
        style,
      ]}
    />
  );
}

export const textStyles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});
