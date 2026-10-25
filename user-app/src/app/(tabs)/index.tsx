import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { refreshMe } from '../../services/user';
import { useSocketEvent } from '../../services/socket';
import { useAuthStore } from '../../store/auth';
import { useNotificationStore } from '../../store/notifications';
import { PickupCard } from '../../components/PickupCard';
import { CampaignCard } from '../../components/CampaignCard';
import {
  Card, Divider, IconButton, Screen, SectionHeader, Skeleton, Text, categoryStyle, colors, radius, spacing, Icon } from '../../ui';
import { formatNumber, formatRupiah } from '../../lib/format';
import { ACTIVE_STATUSES } from '../../lib/status';
import type { Campaign, PickupOrder } from '../../lib/types';

type IconName = keyof typeof Ionicons.glyphMap;

// Setor sampah adalah pekerjaan utama layar ini, jadi hanya ubin itu yang terisi warna merek.
const ACTIONS: { label: string; icon: IconName; route: string; primary?: boolean }[] = [
  { label: 'Setor sampah', icon: 'leaf-outline', route: '/setor', primary: true },
  { label: 'Donasi', icon: 'heart-outline', route: '/(tabs)/katalog' },
  { label: 'Pindai QR', icon: 'scan-outline', route: '/scan' },
  { label: 'Peringkat', icon: 'ribbon-outline', route: '/(tabs)/profil' },
];

type Distribution = { category: string; total_weight: number }[];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unread = useNotificationStore((s) => s.unread);
  const [active, setActive] = useState<PickupOrder[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [distribution, setDistribution] = useState<Distribution>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [pickups, camp, dist] = await Promise.allSettled([
      api.get<PickupOrder[]>('/pickups'),
      api.get<Campaign[]>('/campaigns'),
      api.get<Distribution>('/users/me/distribution'),
      refreshMe(),
    ]);
    if (pickups.status === 'fulfilled') setActive(pickups.value.data.filter((p) => ACTIVE_STATUSES.includes(p.status)));
    else setActive([]);
    if (camp.status === 'fulfilled') setCampaigns(camp.value.data.slice(0, 5));
    else setCampaigns([]);
    if (dist.status === 'fulfilled') setDistribution(dist.value.data.filter((d) => d.total_weight > 0));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useSocketEvent(['order:accepted', 'order:arrived', 'order:weighed', 'order:completed', 'order:cancelled'], () => load());

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="bodySmall" tone="muted">{greeting()}</Text>
            <Text variant="title" numberOfLines={1}>{user?.name?.split(' ')[0] || 'Sahabat Bumi'}</Text>
          </View>
          <IconButton icon="notifications-outline" size={44} accessibilityLabel="Notifikasi" badge={unread}
            onPress={() => router.push('/notifications')} />
        </View>

        <Card style={styles.balance}>
          <Text variant="bodySmall" weight="500" tone="muted">Saldo poin donasi</Text>
          <View style={styles.pointsRow}>
            <Text variant="display" tabular>{formatNumber(user?.points)}</Text>
            <Text tone="muted">poin</Text>
          </View>
          <Text variant="bodySmall" tone="muted">Setara {formatRupiah(user?.points)} untuk donasi</Text>

          <Divider style={styles.divider} />
          <Composition totalKg={user?.total_kg ?? 0} distribution={distribution} />
          <Text variant="caption" tone="muted" style={styles.impact}>
            Setara {formatNumber(user?.total_co2, 2)} kg emisi CO₂ dicegah · {formatRupiah(user?.total_donations_rp)} sudah didonasikan
          </Text>
        </Card>

        <View style={styles.actions}>
          {ACTIONS.map((a) => (
            <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label}
              onPress={() => router.push(a.route as never)}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: a.primary ? (pressed ? colors.primaryDark : colors.primary) : (pressed ? colors.primarySoftPressed : colors.primarySoft) },
              ]}>
              <Icon name={a.icon} size={22} color={a.primary ? colors.onPrimary : colors.primary} />
              <Text variant="caption" align="center" style={{ color: a.primary ? colors.onPrimary : colors.primary }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {active === null ? (
          <Skeleton height={160} radius={radius.card} style={styles.section} />
        ) : active.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Penjemputan aktif" action="Lihat semua" onAction={() => router.push('/(tabs)/riwayat')} />
            {active.slice(0, 2).map((o) => (
              <PickupCard key={o.id} order={o} onPress={() => router.push(`/pickup/${o.id}`)} />
            ))}
          </View>
        ) : (
          <Card style={[styles.section, styles.promo]} onPress={() => router.push('/setor')} accessibilityLabel="Jadwalkan penjemputan">
            <Icon name="bicycle-outline" size={24} color={colors.textMuted} />
            <View style={styles.flex}>
              <Text variant="subheading">Punya sampah daur ulang?</Text>
              <Text variant="bodySmall" tone="muted">Jadwalkan penjemputan gratis, kurir datang ke rumah Anda.</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        )}

        <View style={styles.section}>
          <SectionHeader title="Kampanye pilihan" action="Semua" onAction={() => router.push('/(tabs)/katalog')} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {campaigns === null
          ? [0, 1].map((i) => <Skeleton key={i} width={256} height={250} radius={radius.card} />)
          : campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} compact onPress={() => router.push(`/campaign/${c.id}`)} />
          ))}
      </ScrollView>
    </Screen>
  );
}

// Komposisi setoran: bagian tiap kategori sampah dari seluruh setoran yang tercatat.
// Total kg di judul memakai angka akun; batang dan persentase memakai proporsi dari distribusi.
function Composition({ totalKg, distribution }: { totalKg: number; distribution: Distribution }) {
  const sum = distribution.reduce((s, d) => s + d.total_weight, 0);
  return (
    <View>
      <View style={styles.compHead}>
        <Text variant="bodySmall" weight="500" tone="muted">Sudah didaur ulang</Text>
        <View style={styles.kgRow}>
          <Text variant="subheading" tabular>{formatNumber(totalKg, 1)}</Text>
          <Text variant="bodySmall" tone="muted">kg</Text>
        </View>
      </View>
      {sum > 0 ? (
        <>
          <View style={styles.stack} accessibilityLabel="Komposisi setoran per kategori">
            {distribution.map((d) => (
              <View key={d.category} style={{ flex: d.total_weight, backgroundColor: categoryStyle(d.category).ink, borderRadius: 3 }} />
            ))}
          </View>
          <View style={styles.legend}>
            {distribution.map((d) => {
              const c = categoryStyle(d.category);
              return (
                <View key={d.category} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: c.ink }]} />
                  <Text variant="bodySmall" tone="muted" style={styles.flex}>{c.short}</Text>
                  <Text variant="bodySmall" weight="500" tabular>{Math.round((d.total_weight / sum) * 100)}%</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text variant="bodySmall" tone="muted" style={styles.empty}>Komposisi muncul setelah setoran pertama disetujui.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  balance: { padding: spacing.xl },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.xs },
  divider: { marginVertical: spacing.lg },
  compHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kgRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  stack: { flexDirection: 'row', gap: 2, height: 10, marginTop: spacing.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { marginTop: spacing.sm },
  impact: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  action: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingTop: 14, paddingBottom: spacing.md, borderRadius: radius.lg },
  section: { marginTop: spacing.xxl },
  promo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  carousel: { paddingHorizontal: spacing.xxl, gap: spacing.md, paddingBottom: spacing.sm },
});
