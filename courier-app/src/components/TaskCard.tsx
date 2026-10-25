import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, CategoryChip, Divider, Pill, Text, colors, fonts, spacing, Icon } from '../ui';
import { STATUS, mapsUrl, totalKg } from '../lib/status';
import { formatDateTime, formatNumber, formatSchedule } from '../lib/format';
import type { PickupOrder } from '../lib/types';

/** Lingkaran inisial polos (tanpa ikon dekoratif). */
export function InitialsAvatar({
  name,
  size = 36,
  bg = colors.surfaceAlt,
  fg = colors.textMuted,
}: { name?: string | null; size?: number; bg?: string; fg?: string }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontFamily: fonts.semibold, fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.5) }}>
        {initials}
      </Text>
    </View>
  );
}

/** "Botol Plastik" → "Botol plastik". */
export const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

export function TaskCard({ order, onPress, history }: { order: PickupOrder; onPress: () => void; history?: boolean }) {
  const s = STATUS[order.status];
  const showNav = !history && order.status === 'on_the_way';
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`Tugas ${order.id}, ${s.label}`}>
      <View style={styles.top}>
        <InitialsAvatar name={order.user_name || 'Pengguna'} />
        <View style={styles.flex}>
          <Text variant="body" weight="600" numberOfLines={1}>{order.user_name || 'Pengguna'}</Text>
          <Text variant="caption" tone="muted">Order #{order.id}</Text>
        </View>
        <Pill label={s.label} tone={s.tone} />
      </View>

      <View style={styles.categories}>
        {order.items.map((i) => (
          <CategoryChip
            key={i.id}
            name={i.category}
            label={`${sentenceCase(i.category)} · ${formatNumber(i.actual_weight ?? i.estimated_weight, 1)} kg`}
          />
        ))}
      </View>

      <Divider style={styles.rule} />

      <View style={styles.row}>
        <Icon name={history ? 'checkmark-done-outline' : 'calendar-outline'} size={16} color={colors.textMuted} />
        <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>
          {history && order.completed_at ? `Disetujui ${formatDateTime(order.completed_at)}` : formatSchedule(order.scheduled_at)}
        </Text>
        <Text variant="bodySmall" weight="600" tabular>{formatNumber(totalKg(order.items), 1)} kg</Text>
      </View>
      <View style={styles.row}>
        <Icon name="location-outline" size={16} color={colors.textMuted} />
        <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>{order.pickup_address}</Text>
      </View>

      {showNav && (
        <Button
          title="Navigasi"
          icon="navigate-outline"
          variant="secondary"
          size="sm"
          style={styles.nav}
          onPress={() => Linking.openURL(mapsUrl(order.pickup_lat, order.pickup_lng))}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  rule: { marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  nav: { marginTop: spacing.md },
  flex: { flex: 1 },
});
