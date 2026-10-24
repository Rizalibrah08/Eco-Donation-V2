import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getErrorMessage } from '../../services/api';
import { useSocketEvent } from '../../services/socket';
import { PickupCard } from '../../components/PickupCard';
import { EmptyState, Segmented, SkeletonCard, Text, colors, radius, spacing } from '../../ui';
import { formatDate, formatNumber, formatTime } from '../../lib/format';
import { ACTIVE_STATUSES } from '../../lib/status';
import type { PickupOrder, Transaction } from '../../lib/types';

type Tab = 'pickups' | 'transactions';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pickups');
  const [pickups, setPickups] = useState<PickupOrder[] | null>(null);
  const [trx, setTrx] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, t] = await Promise.all([
        api.get<PickupOrder[]>('/pickups'),
        api.get<Transaction[]>('/users/me/transactions', { params: { limit: 100 } }),
      ]);
      setPickups(p.data);
      setTrx(t.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setPickups((v) => v || []);
      setTrx((v) => v || []);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useSocketEvent(['order:accepted', 'order:arrived', 'order:weighed', 'order:completed', 'order:cancelled'], () => load());

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pickupSections = useMemo(() => {
    if (!pickups) return [];
    const active = pickups.filter((p) => ACTIVE_STATUSES.includes(p.status));
    const done = pickups.filter((p) => !ACTIVE_STATUSES.includes(p.status));
    return [
      ...(active.length ? [{ title: 'Sedang berjalan', data: active }] : []),
      ...(done.length ? [{ title: 'Riwayat penjemputan', data: done }] : []),
    ];
  }, [pickups]);

  const trxSections = useMemo(() => {
    if (!trx) return [];
    const groups = new Map<string, Transaction[]>();
    trx.forEach((t) => {
      const key = formatDate(t.created_at);
      groups.set(key, [...(groups.get(key) || []), t]);
    });
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [trx]);

  const activeCount = pickups?.filter((p) => ACTIVE_STATUSES.includes(p.status)).length || 0;
  const loading = tab === 'pickups' ? pickups === null : trx === null;

  const empty = loading ? (
    <View>{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</View>
  ) : error ? (
    <EmptyState icon="cloud-offline-outline" title="Gagal memuat" message={error} actionLabel="Coba lagi" onAction={load} />
  ) : tab === 'pickups' ? (
    <EmptyState icon="bicycle-outline" title="Belum ada penjemputan" message="Setor sampah pertama Anda dan kumpulkan poin donasi."
      actionLabel="Setor Sampah" onAction={() => router.push('/setor')} />
  ) : (
    <EmptyState icon="receipt-outline" title="Belum ada transaksi" message="Riwayat poin masuk dan donasi akan tampil di sini." />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text variant="title">Aktivitas</Text>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pickups', label: 'Penjemputan', count: activeCount },
            { value: 'transactions', label: 'Mutasi Poin' },
          ]}
          style={styles.segment}
        />
      </View>

      {tab === 'pickups' ? (
        <SectionList
          sections={pickupSections}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderSectionHeader={({ section }) => <Text variant="overline" tone="subtle" style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => <PickupCard order={item} onPress={() => router.push(`/pickup/${item.id}`)} />}
          ListEmptyComponent={empty}
        />
      ) : (
        <SectionList
          sections={trxSections}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderSectionHeader={({ section }) => <Text variant="overline" tone="subtle" style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item, index, section }) => (
            <TrxRow
              item={item}
              first={index === 0}
              last={index === section.data.length - 1}
              onPress={item.ref_type === 'pickup' && item.ref_id ? () => router.push(`/pickup/${item.ref_id}`) : undefined}
            />
          )}
          ListEmptyComponent={empty}
        />
      )}
    </View>
  );
}

function TrxRow({ item, first, last, onPress }: { item: Transaction; first: boolean; last: boolean; onPress?: () => void }) {
  const credit = item.points > 0;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.trx,
        first && styles.trxFirst,
        last && styles.trxLast,
        !last && styles.trxDivider,
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <View style={[styles.trxIcon, { backgroundColor: credit ? colors.successSoft : colors.dangerSoft }]}>
        <Ionicons name={credit ? 'leaf' : 'heart'} size={18} color={credit ? colors.success : colors.danger} />
      </View>
      <View style={styles.flex}>
        <Text variant="subheading" numberOfLines={1}>{item.title}</Text>
        <Text variant="caption" tone="subtle" numberOfLines={1}>
          {formatTime(item.created_at)}{item.description ? ` • ${item.description}` : ''}
        </Text>
      </View>
      <Text variant="subheading" tone={credit ? 'success' : 'danger'}>
        {credit ? '+' : '−'}{formatNumber(Math.abs(item.points))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg },
  segment: { marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  flex: { flex: 1 },
  trx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  trxFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  trxLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  trxDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  trxIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
