import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from './theme';
import { Icon } from './Icon';
import { Text } from './Text';

export type PillTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<PillTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
};

interface PillProps {
  label: string;
  tone?: PillTone;
  icon?: keyof typeof Ionicons.glyphMap;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Pill({ label, tone = 'neutral', icon, dot, style }: PillProps) {
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: t.fg }]} />}
      {icon && <Icon name={icon} size={12} color={t.fg} />}
      <Text variant="caption" weight="500" style={{ color: t.fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
