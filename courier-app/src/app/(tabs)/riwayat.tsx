import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { TaskCard } from '../../components/TaskCard';
import { EmptyState, Screen, SkeletonCard, Text, spacing } from '../../ui';
import { formatDate, formatNumber } from '../../lib/format';
import type { PickupOrder } from '../../lib/types';

export default function HistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PickupOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PickupOrder[]>('/courier/history', { params: { limit: 50 } });
      setItems(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Kelompokkan per tanggal disetujui (urutan dari server dipertahankan).
  const groups = useMemo(() => {
    if (!items) return [];
    const out: { label: string; orders: PickupOrder[] }[] = [];
    for (const o of items) {
      const label = dayHeading(o.completed_at || o.scheduled_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.orders.push(o);
      else out.push({ label, orders: [o] });
    }
    return out;
  }, [items]);

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      <View style={styles.head}>
        <Text variant="title">Riwayat</Text>
        {items && items.length > 0 && (
          <Text variant="bodySmall" tone="muted">{formatNumber(items.length)} penjemputan selesai</Text>
        )}
      </View>
      {error && !items ? (
        <EmptyState icon="cloud-offline-outline" title="Tidak dapat memuat" message={error} actionLabel="Coba lagi"
          onAction={load} />
      ) : !items ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : items.length === 0 ? (
        <EmptyState icon="time-outline" title="Belum ada riwayat"
          message="Penjemputan yang sudah disetujui pengguna akan tercatat di sini." />
      ) : (
        groups.map((g, gi) => (
          <View key={`${g.label}-${gi}`} style={gi > 0 ? styles.group : undefined}>
            <Text variant="caption" tone="muted" style={styles.groupLabel}>{g.label}</Text>
            {g.orders.map((o) => (
              <TaskCard key={o.id} order={o} history onPress={() => router.push(`/task/${o.id}`)} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

function dayHeading(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hari ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return formatDate(iso);
}

const styles = StyleSheet.create({
  head: { gap: spacing.xs, marginBottom: spacing.xxl },
  group: { marginTop: spacing.sm },
  groupLabel: { marginBottom: spacing.sm },
});
