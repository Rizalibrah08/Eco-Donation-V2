import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from './theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { Button } from './Button';

// ---------- EmptyState ----------
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text variant="heading" align="center">{title}</Text>
      {message && <Text variant="bodySmall" tone="muted" align="center" style={styles.emptyMsg}>{message}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} variant="secondary" size="sm" onPress={onAction} style={{ marginTop: spacing.lg }} />
      )}
    </View>
  );
}

// ---------- Skeleton ----------
interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// Batang abu-abu datar seukuran nilai aslinya; tanpa shimmer agar tata letak tidak bergeser.
export function Skeleton({ width = '100%', height = 16, radius: r = radius.sm, style }: SkeletonProps) {
  return <View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceAlt }, style]} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton width="45%" height={14} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} style={{ marginTop: spacing.md }} />
      ))}
    </View>
  );
}

// ---------- ProgressBar ----------
interface ProgressBarProps {
  value: number; // 0..1
  color?: string;
  track?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ value, color = colors.primary, track = colors.surfaceAlt, height = 8, style }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}
    >
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

// ---------- Avatar ----------
export function Avatar({ name, size = 44, color = colors.primary }: { name?: string; size?: number; color?: string }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '1F', alignItems: 'center', justifyContent: 'center' }}>
      <Text weight="600" style={{ color, fontSize: size * 0.36, lineHeight: size * 0.5 }}>{initials}</Text>
    </View>
  );
}

// ---------- Divider & SectionHeader ----------
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      <Text variant="heading">{title}</Text>
      {action && onAction && (
        <Text variant="bodySmall" tone="primary" weight="600" onPress={onAction} accessibilityRole="button" suppressHighlighting>
          {action}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyMsg: { marginTop: spacing.xs, maxWidth: 300 },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.rule },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
