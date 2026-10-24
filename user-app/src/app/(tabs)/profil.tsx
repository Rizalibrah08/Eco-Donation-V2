import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { refreshMe } from '../../services/user';
import { useAuthStore } from '../../store/auth';
import {
  Avatar, Card, Dialog, Divider, ListRow, ProgressBar, Screen, SectionHeader, Text, colors, radius, spacing,
} from '../../ui';
import { formatNumber, formatRupiah } from '../../lib/format';
import { CATEGORY_META } from '../../lib/status';
import type { Badge, BadgeTier } from '../../lib/types';

const TIER: Record<BadgeTier, { label: string; color: string }> = {
  bronze: { label: 'Perunggu', color: colors.bronze },
  silver: { label: 'Perak', color: colors.silver },
  gold: { label: 'Emas', color: colors.gold },
};

const BADGE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  leaf: 'leaf', refresh: 'sync', heart: 'heart', trophy: 'trophy',
};

interface Leaderboard {
  entries: { rank: number; id: number; name: string; points: number }[];
  me: { rank: number; points: number } | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [distribution, setDistribution] = useState<{ category: string; total_weight: number }[]>([]);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [lb, dist] = await Promise.allSettled([
      api.get<Leaderboard>('/leaderboard', { params: { limit: 5 } }),
      api.get('/users/me/distribution'),
      refreshMe(),
    ]);
    if (lb.status === 'fulfilled') setLeaderboard(lb.value.data);
    if (dist.status === 'fulfilled') setDistribution(dist.value.data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalDist = distribution.reduce((s, d) => s + d.total_weight, 0);

  return (
    <>
      <Screen padded={false} edgeToEdge statusBar="light" refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
        <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.avatarRing}>
            <Avatar name={user?.name} size={72} color="#FFFFFF" />
          </View>
          <Text variant="title" tone="inverse" style={styles.name}>{user?.name}</Text>
          <Text variant="bodySmall" style={styles.email}>{user?.email}</Text>
          <View style={styles.headerStats}>
            <HeaderStat value={formatNumber(user?.total_setor_count)} label="Setoran" />
            <View style={styles.headerDivider} />
            <HeaderStat value={formatNumber(user?.total_donasi_count)} label="Donasi" />
            <View style={styles.headerDivider} />
            <HeaderStat value={leaderboard?.me ? `#${leaderboard.me.rank}` : '-'} label="Peringkat" />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <SectionHeader title="Portofolio dampak" />
          <View style={styles.impactGrid}>
            <ImpactTile icon="trash-bin" color={colors.primary} value={`${formatNumber(user?.total_kg, 1)} kg`} label="Sampah didaur ulang" />
            <ImpactTile icon="cloud" color={colors.info} value={`${formatNumber(user?.total_co2, 1)} kg`} label="Emisi CO₂ dicegah" />
            <ImpactTile icon="heart" color="#E11D48" value={formatRupiah(user?.total_donations_rp)} label="Donasi tersalurkan" />
          </View>

          {distribution.length > 0 && (
            <Card style={styles.block}>
              <Text variant="subheading">Komposisi sampah</Text>
              <View style={styles.stack}>
                {distribution.map((d) => (
                  <View key={d.category} style={{ flex: d.total_weight, backgroundColor: CATEGORY_META[d.category]?.color || colors.primary }} />
                ))}
              </View>
              {distribution.map((d) => (
                <View key={d.category} style={styles.legend}>
                  <View style={[styles.legendDot, { backgroundColor: CATEGORY_META[d.category]?.color || colors.primary }]} />
                  <Text variant="bodySmall" style={styles.flex}>{d.category}</Text>
                  <Text variant="bodySmall" tone="muted">{formatNumber(d.total_weight, 1)} kg</Text>
                  <Text variant="bodySmall" weight="700" style={styles.pct}>{Math.round((d.total_weight / totalDist) * 100)}%</Text>
                </View>
              ))}
            </Card>
          )}

          <SectionHeader title="Lencana" style={styles.sectionGap} />
          <View style={styles.badges}>
            {(user?.badges || []).map((b) => (
              <Pressable key={b.key} accessibilityRole="button" accessibilityLabel={`Lencana ${b.name}`}
                style={styles.badge} onPress={() => setBadge(b)}>
                <View style={[styles.badgeIcon, { backgroundColor: b.tier ? TIER[b.tier].color + '22' : colors.surfaceAlt, borderColor: b.tier ? TIER[b.tier].color : colors.border }]}>
                  <Ionicons name={BADGE_ICON[b.icon] || 'ribbon'} size={24} color={b.tier ? TIER[b.tier].color : colors.textSubtle} />
                </View>
                <Text variant="caption" weight="700" align="center" numberOfLines={1}>{b.name}</Text>
                <Text variant="caption" tone="subtle" align="center">{b.tier ? TIER[b.tier].label : 'Terkunci'}</Text>
                <ProgressBar value={b.progress} height={4} color={b.tier ? TIER[b.tier].color : colors.primary} style={styles.badgeBar} />
              </Pressable>
            ))}
          </View>

          <SectionHeader title="Papan peringkat" style={styles.sectionGap} />
          <Card padded={false}>
            {(leaderboard?.entries || []).map((e, i) => {
              const me = e.id === user?.id;
              return (
                <View key={e.id}>
                  {i > 0 && <Divider />}
                  <View style={[styles.rank, me && styles.rankMe]}>
                    <View style={[styles.rankNo, e.rank <= 3 && { backgroundColor: [colors.gold, colors.silver, colors.bronze][e.rank - 1] }]}>
                      <Text variant="caption" weight="800" style={{ color: e.rank <= 3 ? '#FFFFFF' : colors.textMuted }}>{e.rank}</Text>
                    </View>
                    <Avatar name={e.name} size={34} />
                    <Text variant="subheading" style={styles.flex} numberOfLines={1}>{e.name}{me ? ' (Anda)' : ''}</Text>
                    <Text variant="bodySmall" weight="700">{formatNumber(e.points)}</Text>
                  </View>
                </View>
              );
            })}
            {leaderboard?.me && !leaderboard.entries.some((e) => e.id === user?.id) && (
              <>
                <Divider />
                <View style={[styles.rank, styles.rankMe]}>
                  <View style={styles.rankNo}><Text variant="caption" weight="800" tone="muted">{leaderboard.me.rank}</Text></View>
                  <Avatar name={user?.name} size={34} />
                  <Text variant="subheading" style={styles.flex}>Anda</Text>
                  <Text variant="bodySmall" weight="700">{formatNumber(leaderboard.me.points)}</Text>
                </View>
              </>
            )}
          </Card>

          <SectionHeader title="Akun" style={styles.sectionGap} />
          <Card padded={false}>
            <ListRow icon="person-outline" title="Edit profil & kata sandi" onPress={() => router.push('/settings')} />
            <Divider />
            <ListRow icon="notifications-outline" title="Notifikasi" onPress={() => router.push('/notifications')} />
            <Divider />
            <ListRow icon="help-circle-outline" title="Pusat bantuan" onPress={() => router.push('/help')} />
            <Divider />
            <ListRow icon="log-out-outline" title="Keluar" danger onPress={() => setConfirmLogout(true)} />
          </Card>
          <Text variant="caption" tone="subtle" align="center" style={styles.version}>Eco-Donation v1.0.0</Text>
        </View>
      </Screen>

      <Dialog
        visible={!!badge}
        tone="primary"
        icon={badge ? BADGE_ICON[badge.icon] || 'ribbon' : 'ribbon'}
        title={badge?.name || ''}
        message={badge?.description}
        confirmLabel="Tutup"
        onConfirm={() => setBadge(null)}
      >
        {badge && (
          <View style={styles.badgeDetail}>
            <Text variant="bodySmall" tone="muted" align="center">
              Pencapaian Anda: <Text variant="bodySmall" weight="700">{formatNumber(badge.value, 1)} {badge.unit}</Text>
            </Text>
            {badge.next_tier ? (
              <>
                <ProgressBar value={badge.progress} style={{ marginTop: spacing.md }} color={TIER[badge.next_tier].color} />
                <Text variant="caption" tone="subtle" align="center" style={{ marginTop: spacing.sm }}>
                  {formatNumber(badge.next_target)} {badge.unit} untuk tingkat {TIER[badge.next_tier].label}
                </Text>
              </>
            ) : (
              <Text variant="caption" tone="success" weight="700" align="center" style={{ marginTop: spacing.sm }}>
                Tingkat tertinggi tercapai!
              </Text>
            )}
          </View>
        )}
      </Dialog>

      <Dialog
        visible={confirmLogout}
        tone="danger"
        icon="log-out"
        title="Keluar dari akun?"
        message="Anda perlu masuk kembali untuk menyetor sampah dan berdonasi."
        cancelLabel="Batal"
        confirmLabel="Keluar"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); logout(); }}
      />
    </>
  );
}

function HeaderStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.headerStat}>
      <Text variant="heading" tone="inverse">{value}</Text>
      <Text variant="caption" style={styles.email}>{label}</Text>
    </View>
  );
}

function ImpactTile({ icon, color, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: string; label: string }) {
  return (
    <Card style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: color + '17' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text variant="subheading" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text variant="caption" tone="subtle">{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  avatarRing: { padding: 4, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.18)' },
  name: { marginTop: spacing.md },
  email: { color: 'rgba(255,255,255,0.8)' },
  headerStats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerStat: { flex: 1, alignItems: 'center' },
  headerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { padding: spacing.lg },
  impactGrid: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, padding: spacing.md, gap: 4 },
  tileIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  block: { marginTop: spacing.md },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginVertical: spacing.md, gap: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs + 2 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  pct: { width: 40, textAlign: 'right' },
  sectionGap: { marginTop: spacing.xxl },
  badges: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: { width: '23%', alignItems: 'center' },
  badgeIcon: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  badgeBar: { alignSelf: 'stretch', marginTop: spacing.xs + 2 },
  badgeDetail: { alignSelf: 'stretch', marginTop: spacing.lg },
  rank: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rankMe: { backgroundColor: colors.primarySoft },
  rankNo: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  version: { marginTop: spacing.xl },
});
