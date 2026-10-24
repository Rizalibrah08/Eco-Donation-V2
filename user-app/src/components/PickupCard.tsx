import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Pill, Text, colors, spacing } from '../ui';
import { STATUS, CATEGORY_META } from '../lib/status';
import { formatNumber, formatSchedule } from '../lib/format';
import type { PickupOrder } from '../lib/types';

export function PickupCard({ order, onPress }: { order: PickupOrder; onPress: () => void }) {
  const s = STATUS[order.status];
  const totalKg = order.items.reduce((sum, i) => sum + (i.actual_weight ?? i.estimated_weight), 0);
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`Penjemputan ${order.id}, ${s.label}`}>
      <View style={styles.top}>
        <Text variant="caption" tone="subtle">Penjemputan #{order.id}</Text>
        <Pill label={s.label} tone={s.tone} dot />
      </View>
      <View style={styles.categories}>
        {order.items.map((i) => {
          const meta = CATEGORY_META[i.category];
          return (
            <View key={i.id} style={[styles.cat, { backgroundColor: (meta?.color || colors.primary) + '14' }]}>
              <Ionicons name={meta?.icon || 'cube'} size={14} color={meta?.color || colors.primary} />
              <Text variant="caption" weight="600">{i.category}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSubtle} />
        <Text variant="bodySmall" tone="muted" style={styles.flex}>{formatSchedule(order.scheduled_at)}</Text>
        <Text variant="bodySmall" weight="700">{formatNumber(totalKg, 1)} kg</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.textSubtle} />
        <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>{order.pickup_address}</Text>
      </View>
      {order.status === 'pending_verification' && (
        <View style={styles.cta}>
          <Ionicons name="qr-code" size={16} color={colors.warning} />
          <Text variant="bodySmall" weight="700" tone="warning">Pindai QR kurir untuk menyetujui</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginBottom: spacing.md },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: 10,
    backgroundColor: colors.warningSoft,
  },
});
