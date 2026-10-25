import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { TaskCard } from '../../components/TaskCard';
import { EmptyState, Screen, SkeletonCard, Text, spacing } from '../../ui';
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

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>Riwayat</Text>
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
        items.map((o) => <TaskCard key={o.id} order={o} history onPress={() => router.push(`/task/${o.id}`)} />)
      )}
    </Screen>
  );
}
