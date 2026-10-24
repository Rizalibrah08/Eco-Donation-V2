import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from './theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const palette: Record<Variant, { bg: string; fg: string; border: string; pressed: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary, pressed: colors.primaryDark },
  secondary: { bg: colors.primarySoft, fg: colors.primaryDark, border: colors.primarySoft, pressed: '#CFE8E1' },
  outline: { bg: colors.surface, fg: colors.text, border: colors.borderStrong, pressed: colors.surfaceAlt },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent', pressed: colors.primarySoft },
  danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger, pressed: '#B91C1C' },
};

const heights: Record<Size, number> = { sm: 36, md: 48, lg: 56 };

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  iconRight,
  fullWidth,
  style,
  ...rest
}: ButtonProps) {
  const p = palette[variant];
  const isDisabled = disabled || loading;
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          backgroundColor: pressed ? p.pressed : p.bg,
          borderColor: p.border,
          opacity: isDisabled ? 0.55 : 1,
        },
        fullWidth && styles.full,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={iconSize} color={p.fg} />}
          <Text variant={size === 'sm' ? 'bodySmall' : 'subheading'} weight="700" style={{ color: p.fg }}>
            {title}
          </Text>
          {iconRight && <Ionicons name={iconRight} size={iconSize} color={p.fg} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
