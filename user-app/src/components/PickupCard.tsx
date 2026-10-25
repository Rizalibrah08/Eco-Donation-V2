import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, CategoryChip, Divider, Pill, Text, categoryStyle, colors, spacing, Icon } from '../ui';
import { STATUS } from '../lib/status';
import { useRates } from '../hooks/useRates';
import { formatNumber, formatSchedule } from '../lib/format';
import type { PickupOrder } from '../lib/types';

export function PickupCard({ order, onPress }: { order: PickupOrder; onPress: () => void }) {
  const s = STATUS[order.status];
  const { rates } = useRates();
  const totalKg = order.items.reduce((sum, i) => sum + (i.actual_weight ?? i.estimated_weight), 0);
  const showCourier = !!order.courier_name && ['on_the_way', 'arrived'].includes(order.status);
  // Sama dengan rumus di detail penjemputan: berat aktual × tarif kategori.
  const earned = order.status === 'completed'
    ? order.items.reduce((sum, i) => sum + Math.round((i.actual_weight ?? 0) * (rates[i.category] || 0)), 0)
    : 0;
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`Penjemputan ${order.id}, ${s.label}`}>
      <View style={styles.top}>
        <Text variant="subheading">Penjemputan #{order.id}</Text>
        <Pill label={s.label} tone={s.tone} dot />
      </View>
      {showCourier && (
        <View style={styles.courier}>
          <Avatar name={order.courier_name!} size={32} color={colors.info} />
          <View style={styles.flex}>
            <Text variant="bodySmall" weight="500">{order.courier_name}</Text>
            <Text variant="caption" tone="muted">{s.hint ?? 'Kurir Anda'}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.categories}>
        {order.items.map((i) => (
          <CategoryChip
            key={i.id}
            name={i.category}
            label={`${categoryStyle(i.category).short} · ${formatNumber(i.actual_weight ?? i.estimated_weight, 1)} kg`}
          />
        ))}
      </View>
      <Divider style={styles.divider} />
      <View style={styles.row}>
        <Icon name="calendar-outline" size={16} color={colors.textMuted} />
        <Text variant="bodySmall" tone="muted" style={styles.flex}>{formatSchedule(order.scheduled_at)}</Text>
        {earned > 0 ? (
          <Text variant="bodySmall" weight="600" tone="success" tabular>+{formatNumber(earned)} poin</Text>
        ) : (
          <Text variant="bodySmall" weight="600" tabular>{formatNumber(totalKg, 1)} kg</Text>
        )}
      </View>
      <View style={styles.row}>
        <Icon name="location-outline" size={16} color={colors.textMuted} />
        <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>{order.pickup_address}</Text>
      </View>
      {order.status === 'pending_verification' && (
        <View style={styles.cta}>
          <Icon name="qr-code-outline" size={16} color={colors.warning} />
          <Text variant="bodySmall" weight="500" tone="warning">Pindai QR kurir untuk menyetujui</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  courier: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  divider: { marginVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xs },
  flex: { flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.md,
    backgroundColor: colors.warningSoft,
  },
});
