import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getErrorMessage } from '../../services/api';
import { useSocketEvent } from '../../services/socket';
import { PickupCard } from '../../components/PickupCard';
import { Card, EmptyState, Segmented, SkeletonCard, Text, colors, radius, spacing, Icon } from '../../ui';
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

  // Ringkasan bulan berjalan, dihitung dari baris mutasi yang tampil.
  const month = useMemo(() => {
    const now = new Date();
    const rows = (trx || []).filter((t) => {
      const d = new Date(t.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const inPts = rows.filter((t) => t.points > 0).reduce((a, t) => a + t.points, 0);
    const outPts = rows.filter((t) => t.points < 0).reduce((a, t) => a - t.points, 0);
    return { label: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), inPts, outPts };
  }, [trx]);

  const activeCount = pickups?.filter((p) => ACTIVE_STATUSES.includes(p.status)).length || 0;
  const loading = tab === 'pickups' ? pickups === null : trx === null;

  const empty = loading ? (
    <View>{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</View>
  ) : error ? (
    <EmptyState icon="cloud-offline-outline" title="Gagal memuat" message={error} actionLabel="Coba lagi" onAction={load} />
  ) : tab === 'pickups' ? (
    <EmptyState icon="bicycle-outline" title="Belum ada penjemputan" message="Setor sampah pertama Anda dan kumpulkan poin donasi."
      actionLabel="Setor sampah" onAction={() => router.push('/setor')} />
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
            { value: 'transactions', label: 'Mutasi poin' },
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
          renderSectionHeader={({ section }) => <Text variant="overline" tone="muted" style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => <PickupCard order={item} onPress={() => router.push(`/pickup/${item.id}`)} />}
          ListEmptyComponent={empty}
        />
      ) : (
        <SectionList
          sections={trxSections}
          ListHeaderComponent={trx && trx.length > 0 ? <MonthSummary {...month} /> : null}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderSectionHeader={({ section }) => <Text variant="overline" tone="muted" style={styles.sectionTitle}>{section.title}</Text>}
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

function MonthSummary({ label, inPts, outPts }: { label: string; inPts: number; outPts: number }) {
  const net = inPts - outPts;
  const cols = [
    { l: 'Masuk', v: `+${formatNumber(inPts)}`, tone: 'success' as const },
    { l: 'Didonasikan', v: outPts ? `−${formatNumber(outPts)}` : '0', tone: 'default' as const },
    { l: 'Selisih', v: `${net > 0 ? '+' : net < 0 ? '−' : ''}${formatNumber(Math.abs(net))}`, tone: 'default' as const },
  ];
  return (
    <Card style={styles.summary}>
      <Text variant="bodySmall" weight="500" tone="muted">{label}</Text>
      <View style={styles.summaryRow}>
        {cols.map((c) => (
          <View key={c.l} style={styles.flex}>
            <Text variant="caption" tone="muted">{c.l}</Text>
            <Text variant="heading" tone={c.tone} tabular style={styles.summaryValue}>{c.v}</Text>
          </View>
        ))}
      </View>
    </Card>
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
      <View style={styles.trxIcon}>
        <Icon name={credit ? 'leaf-outline' : 'heart-outline'} size={18} color={colors.textMuted} />
      </View>
      <View style={styles.flex}>
        <Text variant="subheading" numberOfLines={1}>{item.title}</Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {formatTime(item.created_at)}{item.description ? ` · ${item.description}` : ''}
        </Text>
      </View>
      <Text variant="subheading" tone={credit ? 'success' : 'default'} tabular>
        {credit ? '+' : '−'}{formatNumber(Math.abs(item.points))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xxl },
  segment: { marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxl },
  summary: { marginTop: spacing.md, paddingHorizontal: spacing.xl, gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.lg },
  summaryValue: { fontSize: 20, lineHeight: 26, marginTop: 2 },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  flex: { flex: 1 },
  trx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  trxFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  trxLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  trxDivider: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  trxIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
