import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from './theme';
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

export function ListRow({ icon, iconColor = colors.primary, title, subtitle, value, onPress, chevron = !!onPress, danger }: ListRowProps) {
  const color = danger ? colors.danger : iconColor;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon && (
        <View style={[styles.icon, { backgroundColor: color + '17' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      )}
      <View style={styles.body}>
        <Text variant="subheading" tone={danger ? 'danger' : 'default'}>{title}</Text>
        {subtitle && <Text variant="bodySmall" tone="muted">{subtitle}</Text>}
      </View>
      {value && <Text variant="bodySmall" tone="muted">{value}</Text>}
      {chevron && <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />}
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
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
});
