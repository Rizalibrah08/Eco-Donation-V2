import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Pill, Text, colors, radius, spacing } from '../ui';
import { CATEGORY_META, STATUS, totalKg } from '../lib/status';
import { formatDateTime, formatNumber, formatSchedule } from '../lib/format';
import type { PickupOrder } from '../lib/types';

export function TaskCard({ order, onPress, history }: { order: PickupOrder; onPress: () => void; history?: boolean }) {
  const s = STATUS[order.status];
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`Tugas ${order.id}, ${s.label}`}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text variant="subheading" numberOfLines={1}>{order.user_name || 'Pengguna'}</Text>
          <Text variant="caption" tone="subtle">Order #{order.id}</Text>
        </View>
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
        <Ionicons name={history ? 'checkmark-done-outline' : 'calendar-outline'} size={16} color={colors.textSubtle} />
        <Text variant="bodySmall" tone="muted" style={styles.flex}>
          {history && order.completed_at ? formatDateTime(order.completed_at) : formatSchedule(order.scheduled_at)}
        </Text>
        <Text variant="bodySmall" weight="700">{formatNumber(totalKg(order.items), 1)} kg</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.textSubtle} />
        <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>{order.pickup_address}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginBottom: spacing.md },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
});
