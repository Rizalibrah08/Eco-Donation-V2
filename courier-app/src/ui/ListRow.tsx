import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from './theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface ListRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
}

export function ListRow({ icon, iconColor = colors.textMuted, title, subtitle, value, onPress, chevron = !!onPress, danger }: ListRowProps) {
  const color = danger ? colors.danger : iconColor;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon && (
        <Icon name={icon} size={20} color={color} />
      )}
      <View style={styles.body}>
        <Text variant="body" tone={danger ? 'danger' : 'default'}>{title}</Text>
        {subtitle && <Text variant="bodySmall" tone="muted">{subtitle}</Text>}
      </View>
      {value && <Text variant="bodySmall" tone="muted">{value}</Text>}
      {chevron && <Icon name="chevron-forward" size={18} color={colors.textSubtle} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  body: { flex: 1 },
});
