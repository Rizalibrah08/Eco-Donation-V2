import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from './theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export function Chip({ label, selected, onPress, icon, disabled }: ChipProps) {
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        pressed && !selected && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon && <Ionicons name={icon} size={16} color={fg} />}
      <Text variant="bodySmall" weight="600" style={{ color: fg }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 36,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { backgroundColor: colors.surfaceAlt },
  disabled: { opacity: 0.4 },
});
