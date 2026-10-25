import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, colors, spacing, Icon } from '../ui';
import { TIMELINE } from '../lib/status';
import { formatTime } from '../lib/format';
import type { PickupOrder } from '../lib/types';

const TIME_FIELD: Record<string, keyof PickupOrder> = {
  waiting: 'created_at',
  on_the_way: 'accepted_at',
  arrived: 'arrived_at',
  pending_verification: 'weighed_at',
  completed: 'completed_at',
};

export function StatusTimeline({ order }: { order: PickupOrder }) {
  const currentIndex = TIMELINE.findIndex((t) => t.status === order.status);
  return (
    <View>
      {TIMELINE.map((step, i) => {
        const done = i < currentIndex || order.status === 'completed';
        const active = i === currentIndex && order.status !== 'completed';
        const time = order[TIME_FIELD[step.status]] as string | null;
        const last = i === TIMELINE.length - 1;
        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done && <Icon name="checkmark" size={12} color="#FFFFFF" />}
                {active && <View style={styles.inner} />}
              </View>
              {!last && <View style={[styles.line, done && styles.lineDone]} />}
            </View>
            <View style={[styles.body, last && styles.bodyLast]}>
              <Text
                variant="bodySmall"
                weight={active ? '600' : done ? '500' : '400'}
                tone={done || active ? 'default' : 'muted'}
                style={styles.label}
              >
                {step.label}
              </Text>
              {time && (done || active) && (
                <Text variant="bodySmall" tone="muted" tabular>{formatTime(time)}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rail: { width: 20, alignItems: 'center' },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: { borderColor: colors.primary, borderWidth: 2 },
  inner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  line: { width: 1.5, flex: 1, minHeight: 16, backgroundColor: colors.border, marginVertical: 3 },
  lineDone: { backgroundColor: colors.primary },
  body: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  bodyLast: { paddingBottom: 0 },
  label: { flex: 1, marginTop: 1 },
});
