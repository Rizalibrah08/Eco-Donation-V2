import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, typography } from './theme';

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

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: '400' | '500' | '600' | '700' | '800';
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', tone = 'default', weight, align, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: toneColor[tone] },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

export const textStyles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});
