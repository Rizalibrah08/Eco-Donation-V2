import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { category, colors, radius, spacing } from './theme';
import { Icon } from './Icon';
import { Text } from './Text';

type CategoryKey = keyof typeof category;

// Nama kategori dari backend → kunci warna, ikon, dan label pendek.
const BY_NAME: Record<string, { key: CategoryKey; icon: keyof typeof Ionicons.glyphMap; short: string }> = {
  'Botol Plastik': { key: 'plastik', icon: 'water-outline', short: 'Plastik' },
  Kertas: { key: 'kertas', icon: 'newspaper-outline', short: 'Kertas' },
  Kaleng: { key: 'kaleng', icon: 'beer-outline', short: 'Kaleng' },
  'Botol Kaca': { key: 'kaca', icon: 'wine-outline', short: 'Kaca' },
};

const FALLBACK = { bg: colors.surfaceAlt, ink: colors.textMuted };

export function categoryStyle(name: string) {
  const meta = BY_NAME[name];
  return {
    icon: meta?.icon ?? ('cube-outline' as const),
    short: meta?.short ?? name,
    ...(meta ? category[meta.key] : FALLBACK),
  };
}

/** Ubin persegi pastel dengan ikon bertinta senada. */
export function CategoryTile({ name, size = 36, style }: { name: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const c = categoryStyle(name);
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size >= 36 ? 10 : 8, backgroundColor: c.bg }, style]}>
      <Icon name={c.icon} size={Math.round(size * 0.5)} color={c.ink} />
    </View>
  );
}

/** Chip kecil: ikon + "Botol plastik · 2,5 kg". */
export function CategoryChip({ name, label }: { name: string; label?: string }) {
  const c = categoryStyle(name);
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Icon name={c.icon} size={14} color={c.ink} />
      <Text variant="caption" style={{ color: c.ink }} numberOfLines={1}>
        {label ?? name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
});
