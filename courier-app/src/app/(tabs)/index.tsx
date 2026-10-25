import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { useSocketEvent } from '../../services/socket';
import { useAuthStore } from '../../store/auth';
import { InitialsAvatar, TaskCard } from '../../components/TaskCard';
import { Card, EmptyState, Screen, Segmented, SkeletonCard, Text, colors, fonts, spacing } from '../../ui';
import { totalKg } from '../../lib/status';
import { formatNumber } from '../../lib/format';
import type { PickupOrder } from '../../lib/types';

type Scope = 'available' | 'mine';

export default function TasksScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [scope, setScope] = useState<Scope>('mine');
  const [lists, setLists] = useState<Record<Scope, PickupOrder[] | null>>({ available: null, mine: null });
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [available, mine] = await Promise.all([
        api.get<PickupOrder[]>('/courier/tasks', { params: { scope: 'available' } }),
        api.get<PickupOrder[]>('/courier/tasks', { params: { scope: 'mine' } }),
      ]);
      setLists({ available: available.data, mine: mine.data });
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useSocketEvent(
    ['order:new', 'order:taken', 'order:rejected', 'order:cancelled', 'order:completed'],
    () => load(),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const list = lists[scope];
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="bodySmall" tone="muted">{greeting},</Text>
          <Text variant="title" numberOfLines={1}>{user?.name}</Text>
        </View>
        <InitialsAvatar name={user?.name} size={44} bg={colors.primarySoft} fg={colors.primary} />
      </View>

      {lists.mine && lists.available && (
        <Card style={styles.summary} padded={false}>
          <Stat value={formatNumber(lists.mine.length)} label="Tugas aktif" />
          <View style={styles.vrule} />
          <Stat value={formatNumber(lists.available.length)} label="Tersedia" />
          <View style={styles.vrule} />
          <Stat
            value={`${formatNumber(lists.mine.reduce((sum, o) => sum + totalKg(o.items), 0), 1)} kg`}
            label="Muatan tugas"
          />
        </Card>
      )}

      <Segmented
        value={scope}
        onChange={setScope}
        options={[
          { value: 'mine', label: 'Tugas saya', count: lists.mine?.length },
          { value: 'available', label: 'Tersedia', count: lists.available?.length },
        ]}
        style={styles.tabs}
      />

      {error && !list ? (
        <EmptyState icon="cloud-offline-outline" title="Tidak dapat memuat" message={error} actionLabel="Coba lagi"
          onAction={load} />
      ) : !list ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : list.length === 0 ? (
        scope === 'mine' ? (
          <EmptyState icon="bicycle-outline" title="Belum ada tugas aktif"
            message="Ambil permintaan penjemputan di tab Tersedia."
            actionLabel={lists.available?.length ? 'Lihat yang tersedia' : undefined}
            onAction={lists.available?.length ? () => setScope('available') : undefined} />
        ) : (
          <EmptyState icon="file-tray-outline" title="Belum ada permintaan baru"
            message="Permintaan baru akan muncul otomatis di sini." />
        )
      ) : (
        list.map((o) => <TaskCard key={o.id} order={o} onPress={() => router.push(`/task/${o.id}`)} />)
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} tabular numberOfLines={1}>{value}</Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl },
  summary: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: spacing.lg, marginBottom: spacing.xxl },
  stat: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.xxs },
  statValue: { fontSize: 20, lineHeight: 26, fontFamily: fonts.semibold, color: colors.text },
  vrule: { width: 1, backgroundColor: colors.rule },
  tabs: { marginBottom: spacing.lg },
});
