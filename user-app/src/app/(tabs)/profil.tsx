import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { refreshMe } from '../../services/user';
import { useAuthStore } from '../../store/auth';
import {
  Avatar, Card, Dialog, Divider, IconButton, ListRow, ProgressBar, Screen, SectionHeader, Text, category, colors, radius, spacing, Icon } from '../../ui';
import { formatNumber } from '../../lib/format';
import type { Badge, BadgeTier } from '../../lib/types';

const TIER: Record<BadgeTier, { label: string; color: string }> = {
  bronze: { label: 'Perunggu', color: colors.bronze },
  silver: { label: 'Perak', color: colors.silver },
  gold: { label: 'Emas', color: colors.gold },
};

const BADGE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  leaf: 'leaf-outline', refresh: 'sync-outline', heart: 'heart-outline', trophy: 'trophy-outline',
};

// Warna identitas pucat per orang di papan peringkat (bukan data), berurutan agar stabil.
const PERSON_TINTS = [category.plastik, category.kaleng, category.kertas, category.kaca];

interface Leaderboard {
  entries: { rank: number; id: number; name: string; points: number }[];
  me: { rank: number; points: number } | null;
}

function badgeProgressText(b: Badge) {
  if (!b.tier && b.next_tier) return `${formatNumber(b.value, 1)} dari ${formatNumber(b.next_target)} ${b.unit} untuk membuka`;
  if (b.next_tier) return `${formatNumber(b.value, 1)} dari ${formatNumber(b.next_target)} ${b.unit} menuju ${TIER[b.next_tier].label}`;
  return `${formatNumber(b.value, 1)} ${b.unit} · tingkat tertinggi`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [lb] = await Promise.allSettled([
      api.get<Leaderboard>('/leaderboard', { params: { limit: 5 } }),
      refreshMe(),
    ]);
    if (lb.status === 'fulfilled') setLeaderboard(lb.value.data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const badges = user?.badges || [];
  const earned = badges.filter((b) => b.tier);

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
        <View style={styles.header}>
          <Text variant="title">Profil</Text>
          <IconButton icon="settings-outline" size={44} accessibilityLabel="Edit profil" onPress={() => router.push('/settings')} />
        </View>

        <Card style={styles.identity} padded={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit profil" onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.identityRow, pressed && { backgroundColor: colors.surfaceAlt }]}>
            <Avatar name={user?.name} size={56} color={colors.primary} />
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={1}>{user?.name}</Text>
              <Text variant="bodySmall" tone="muted" numberOfLines={1}>{user?.email}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Divider style={styles.inset} />
          <View style={styles.stats}>
            <Stat value={formatNumber(user?.total_setor_count)} label="Setoran" />
            <View style={styles.vRule} />
            <Stat value={formatNumber(user?.total_donasi_count)} label="Donasi" />
            <View style={styles.vRule} />
            <Stat value={leaderboard?.me ? `#${leaderboard.me.rank}` : '—'} label="Peringkat" />
          </View>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="heading">Lencana</Text>
            <Text variant="bodySmall" tone="muted">{earned.length} dari {badges.length} diraih</Text>
          </View>
          <Card padded={false}>
            {badges.map((b, i) => (
              <View key={b.key}>
                {i > 0 && <Divider style={styles.inset} />}
                <Pressable accessibilityRole="button" accessibilityLabel={`Lencana ${b.name}`} onPress={() => setBadge(b)}
                  style={({ pressed }) => [styles.badgeRow, pressed && { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.medal, { borderColor: b.tier ? TIER[b.tier].color : colors.borderStrong }]}>
                    <Icon name={BADGE_ICON[b.icon] || 'ribbon-outline'} size={20} color={b.tier ? colors.text : colors.textMuted} />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.badgeTitle}>
                      <Text variant="subheading" tone={b.tier ? 'default' : 'muted'} numberOfLines={1} style={styles.flex}>{b.name}</Text>
                      <View style={styles.tierChip}>
                        <Text variant="caption">{b.tier ? TIER[b.tier].label : 'Terkunci'}</Text>
                      </View>
                    </View>
                    <ProgressBar value={b.progress} height={4} color={colors.text} style={styles.badgeBar} />
                    <Text variant="caption" tone="muted">{badgeProgressText(b)}</Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Papan peringkat" />
          <Card padded={false} style={styles.board}>
            {(leaderboard?.entries || []).map((e, i) => {
              const me = e.id === user?.id;
              return <RankRow key={e.id} rank={e.rank} name={me ? `${e.name} (Anda)` : e.name} points={e.points} me={me} tint={i} />;
            })}
            {leaderboard?.me && !leaderboard.entries.some((e) => e.id === user?.id) && (
              <RankRow rank={leaderboard.me.rank} name="Anda" points={leaderboard.me.points} me tint={0} />
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Akun" />
          <Card padded={false}>
            <ListRow icon="create-outline" title="Edit profil & kata sandi" onPress={() => router.push('/settings')} />
            <Divider style={styles.inset} />
            <ListRow icon="notifications-outline" title="Notifikasi" onPress={() => router.push('/notifications')} />
            <Divider style={styles.inset} />
            <ListRow icon="help-circle-outline" title="Pusat bantuan" onPress={() => router.push('/help')} />
            <Divider style={styles.inset} />
            <ListRow icon="log-out-outline" title="Keluar" danger onPress={() => setConfirmLogout(true)} />
          </Card>
          <Text variant="caption" tone="muted" align="center" style={styles.version}>Eco-Donation v1.0.0</Text>
        </View>
      </Screen>

      <Dialog
        visible={!!badge}
        tone="primary"
        icon={badge ? BADGE_ICON[badge.icon] || 'ribbon-outline' : 'ribbon-outline'}
        title={badge?.name || ''}
        message={badge?.description}
        confirmLabel="Tutup"
        onConfirm={() => setBadge(null)}
      >
        {badge && (
          <View style={styles.badgeDetail}>
            <Text variant="bodySmall" tone="muted" align="center">
              Pencapaian Anda: <Text variant="bodySmall" weight="600">{formatNumber(badge.value, 1)} {badge.unit}</Text>
            </Text>
            {badge.next_tier ? (
              <>
                <ProgressBar value={badge.progress} style={{ marginTop: spacing.md }} color={colors.text} />
                <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
                  {formatNumber(badge.next_target)} {badge.unit} untuk tingkat {TIER[badge.next_tier].label}
                </Text>
              </>
            ) : (
              <Text variant="caption" tone="success" weight="600" align="center" style={{ marginTop: spacing.sm }}>
                Tingkat tertinggi tercapai
              </Text>
            )}
          </View>
        )}
      </Dialog>

      <Dialog
        visible={confirmLogout}
        tone="danger"
        icon="log-out-outline"
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading" tabular style={styles.statValue}>{value}</Text>
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}

function RankRow({ rank, name, points, me, tint }: { rank: number; name: string; points: number; me: boolean; tint: number }) {
  const t = me ? { bg: colors.primarySoft, ink: colors.primary } : PERSON_TINTS[(tint - 1 + PERSON_TINTS.length) % PERSON_TINTS.length];
  const initials = name.replace(' (Anda)', '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <View style={[styles.rank, me && styles.rankMe]}>
      <Text variant="subheading" tone="muted" tabular style={styles.rankNo}>{rank}</Text>
      <View style={[styles.rankAvatar, { backgroundColor: me ? colors.surface : t.bg }]}>
        <Text variant="caption" weight="600" style={{ color: t.ink }}>{initials}</Text>
      </View>
      <Text variant="subheading" style={styles.flex} numberOfLines={1}>{name}</Text>
      <Text variant="subheading" tabular>{formatNumber(points)}</Text>
      <Text variant="caption" tone="muted">poin</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  identity: { overflow: 'hidden' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.xl },
  inset: { marginHorizontal: spacing.lg },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, lineHeight: 26 },
  vRule: { width: 1, height: 36, backgroundColor: colors.rule },
  section: { marginTop: spacing.xxl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  medal: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tierChip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  badgeBar: { marginTop: 6, marginBottom: 6 },
  badgeDetail: { alignSelf: 'stretch', marginTop: spacing.lg },
  board: { padding: spacing.sm },
  rank: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radius.md },
  rankMe: { backgroundColor: colors.primarySoft },
  rankNo: { width: 20, textAlign: 'center' },
  rankAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  version: { marginTop: spacing.xl },
});
