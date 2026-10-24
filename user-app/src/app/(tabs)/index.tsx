import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { refreshMe } from '../../services/user';
import { useSocketEvent } from '../../services/socket';
import { useAuthStore } from '../../store/auth';
import { useNotificationStore } from '../../store/notifications';
import { PickupCard } from '../../components/PickupCard';
import { CampaignCard } from '../../components/CampaignCard';
import {
  Card, IconButton, Screen, SectionHeader, Skeleton, Text, colors, radius, shadow, spacing,
} from '../../ui';
import { formatNumber, formatRupiah } from '../../lib/format';
import { ACTIVE_STATUSES } from '../../lib/status';
import type { Campaign, PickupOrder } from '../../lib/types';

type IconName = keyof typeof Ionicons.glyphMap;

const ACTIONS: { label: string; icon: IconName; color: string; route: string }[] = [
  { label: 'Setor Sampah', icon: 'leaf', color: colors.primary, route: '/setor' },
  { label: 'Donasi', icon: 'heart', color: '#E11D48', route: '/(tabs)/katalog' },
  { label: 'Pindai QR', icon: 'qr-code', color: '#D97706', route: '/scan' },
  { label: 'Peringkat', icon: 'trophy', color: '#7C3AED', route: '/(tabs)/profil' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const unread = useNotificationStore((s) => s.unread);
  const [active, setActive] = useState<PickupOrder[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [pickups, camp] = await Promise.allSettled([
      api.get<PickupOrder[]>('/pickups'),
      api.get<Campaign[]>('/campaigns'),
      refreshMe(),
    ]);
    if (pickups.status === 'fulfilled') setActive(pickups.value.data.filter((p) => ACTIVE_STATUSES.includes(p.status)));
    else setActive([]);
    if (camp.status === 'fulfilled') setCampaigns(camp.value.data.slice(0, 5));
    else setCampaigns([]);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useSocketEvent(['order:accepted', 'order:arrived', 'order:weighed', 'order:completed', 'order:cancelled'], () => load());

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen padded={false} edgeToEdge statusBar="light" refreshing={refreshing} onRefresh={onRefresh}>
      <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text variant="bodySmall" style={styles.greet}>{greeting()},</Text>
            <Text variant="title" tone="inverse" numberOfLines={1}>{user?.name?.split(' ')[0] || 'Sahabat Bumi'} 👋</Text>
          </View>
          <IconButton icon="notifications-outline" variant="glass" accessibilityLabel="Notifikasi" badge={unread}
            onPress={() => router.push('/notifications')} />
        </View>
      </LinearGradient>

      <View style={styles.balanceWrap}>
        <Card elevated style={styles.balance}>
          <View style={styles.balanceTop}>
            <View>
              <Text variant="overline" tone="subtle">Saldo poin donasi</Text>
              <View style={styles.pointsRow}>
                <Text variant="display" style={styles.tabular}>{formatNumber(user?.points)}</Text>
                <Text variant="subheading" tone="muted"> poin</Text>
              </View>
              <Text variant="bodySmall" tone="muted">Setara {formatRupiah(user?.points)} untuk donasi</Text>
            </View>
            <View style={styles.coin}>
              <Ionicons name="leaf" size={22} color={colors.primary} />
            </View>
          </View>
          <View style={styles.impactRow}>
            <Impact icon="trash-bin" label="Sampah" value={`${formatNumber(user?.total_kg, 1)} kg`} />
            <View style={styles.vDivider} />
            <Impact icon="cloud" label="CO₂ dicegah" value={`${formatNumber(user?.total_co2, 1)} kg`} />
            <View style={styles.vDivider} />
            <Impact icon="heart" label="Donasi" value={formatRupiah(user?.total_donations_rp)} />
          </View>
        </Card>
      </View>

      <View style={styles.content}>
        <View style={styles.actions}>
          {ACTIONS.map((a) => (
            <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} style={styles.action}
              onPress={() => router.push(a.route as never)}>
              {({ pressed }) => (
                <>
                  <View style={[styles.actionIcon, { backgroundColor: a.color + '15', opacity: pressed ? 0.6 : 1 }]}>
                    <Ionicons name={a.icon} size={24} color={a.color} />
                  </View>
                  <Text variant="caption" weight="600" align="center">{a.label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>

        {active === null ? (
          <Skeleton height={140} radius={radius.lg} style={{ marginTop: spacing.xxl }} />
        ) : active.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Penjemputan aktif" action="Lihat semua" onAction={() => router.push('/(tabs)/riwayat')} />
            {active.slice(0, 2).map((o) => (
              <PickupCard key={o.id} order={o} onPress={() => router.push(`/pickup/${o.id}`)} />
            ))}
          </View>
        ) : (
          <Card style={styles.promo} onPress={() => router.push('/setor')} accessibilityLabel="Jadwalkan penjemputan">
            <View style={styles.promoIcon}>
              <Ionicons name="bicycle" size={26} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="subheading">Punya sampah daur ulang?</Text>
              <Text variant="bodySmall" tone="muted">Jadwalkan penjemputan gratis, kurir datang ke rumah Anda.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
          </Card>
        )}

        <View style={styles.section}>
          <SectionHeader title="Kampanye pilihan" action="Semua" onAction={() => router.push('/(tabs)/katalog')} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {campaigns === null
          ? [0, 1].map((i) => <Skeleton key={i} width={260} height={250} radius={radius.lg} />)
          : campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} compact onPress={() => router.push(`/campaign/${c.id}`)} />
          ))}
      </ScrollView>
    </Screen>
  );
}

function Impact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.impact}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text variant="bodySmall" weight="700" numberOfLines={1}>{value}</Text>
      <Text variant="caption" tone="subtle">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl + spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greet: { color: 'rgba(255,255,255,0.8)' },
  balanceWrap: { paddingHorizontal: spacing.lg, marginTop: -(spacing.xxxl + spacing.xl) },
  balance: { padding: spacing.xl },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between' },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  coin: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  impactRow: {
    flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
  },
  impact: { flex: 1, alignItems: 'center', gap: 2 },
  vDivider: { width: 1, backgroundColor: colors.border },
  content: { paddingHorizontal: spacing.lg },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxl },
  action: { width: '23%', alignItems: 'center', gap: spacing.sm },
  actionIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: spacing.xxl },
  promo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl, ...shadow.sm },
  promoIcon: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  carousel: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
});
