import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../../../services/api';
import { getNonprofit, GlobalNonprofit } from '../../../services/everyOrg';
import { useAuthStore } from '../../../store/auth';
import { useRates } from '../../../hooks/useRates';
import { useDonate } from '../../../hooks/useDonate';
import { HeroHeader } from '../../../components/HeroHeader';
import { DonateSheet } from '../../../components/DonateSheet';
import {
  Button, Card, Dialog, Divider, EmptyState, Pill, Screen, Skeleton, Text, colors, radius, spacing, Icon } from '../../../ui';
import { formatNumber } from '../../../lib/format';

export default function GlobalCampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const externalId = decodeURIComponent(String(id));
  const user = useAuthStore((s) => s.user);
  const { min_donation } = useRates();
  const [org, setOrg] = useState<GlobalNonprofit | null>(null);
  const [stats, setStats] = useState<{ collected_points: number; donor_count: number } | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get(`/campaigns/external/everyorg/${encodeURIComponent(externalId)}/stats`);
      setStats(data);
    } catch {
      setStats({ collected_points: 0, donor_count: 0 });
    }
  }, [externalId]);

  const load = useCallback(async () => {
    setError(false);
    try {
      setOrg(await getNonprofit(externalId));
    } catch {
      setError(true);
    }
    loadStats();
  }, [externalId, loadStats]);

  useEffect(() => { load(); }, [load]);

  const donate = useDonate(
    org ? { source: 'everyorg', external_id: externalId, title: org.name.slice(0, 200), ...(org.imageUrl ? { image_url: org.imageUrl } : {}) } : null,
    loadStats,
  );

  if (error) {
    return (
      <Screen padded={false} edgeToEdge>
        <HeroHeader imageUrl={null} height={200} />
        <EmptyState icon="cloud-offline-outline" title="Gagal memuat organisasi" message="Periksa koneksi internet Anda lalu coba lagi." actionLabel="Coba lagi" onAction={load} />
      </Screen>
    );
  }

  return (
    <>
      <Screen
        padded={false}
        edgeToEdge
        statusBar="light"
        footer={<Button title="Donasikan poin" icon="heart-outline" size="lg" disabled={!org} onPress={() => donate.setOpen(true)} />}
      >
        <HeroHeader imageUrl={org?.imageUrl || null} />
        <View style={styles.body}>
          {!org ? (
            <>
              <Skeleton width="50%" height={20} />
              <Skeleton height={120} radius={radius.card} style={{ marginTop: spacing.xl }} />
            </>
          ) : (
            <>
              <View style={styles.head}>
                {org.logoUrl && <Image source={{ uri: org.logoUrl }} style={styles.logo} />}
                <View style={styles.flex}>
                  <Pill label="Organisasi Global" tone="neutral" icon="earth-outline" />
                  <Text variant="title" style={styles.title}>{org.name}</Text>
                  {org.location && <Text variant="bodySmall" tone="muted">{org.location}</Text>}
                </View>
              </View>

              <Card style={styles.statsCard}>
                <Text variant="display" tabular numberOfLines={1} adjustsFontSizeToFit>
                  {formatNumber(stats?.collected_points)}
                </Text>
                <Text variant="bodySmall" tone="muted">Poin dari komunitas Eco-Donation</Text>
                <Divider style={styles.rule} />
                <View style={styles.statRow}>
                  <Text variant="bodySmall" tone="muted">Donatur</Text>
                  <Text variant="bodySmall" weight="600" tabular>{formatNumber(stats?.donor_count)}</Text>
                </View>
              </Card>

              <Text variant="heading" style={styles.section}>Tentang organisasi</Text>
              <Text tone="muted" numberOfLines={expanded ? undefined : 6}>{org.description}</Text>
              {org.description.length > 280 && (
                <Text variant="bodySmall" tone="primary" weight="600" onPress={() => setExpanded((e) => !e)} style={styles.more}>
                  {expanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'}
                </Text>
              )}

              {org.profileUrl && (
                <Button title="Lihat profil di Every.org" variant="secondary" icon="open-outline" style={styles.section}
                  onPress={() => Linking.openURL(org.profileUrl!)} />
              )}

              <View style={styles.info}>
                <Icon name="information-circle-outline" size={18} color={colors.textMuted} />
                <Text variant="bodySmall" tone="muted" style={styles.flex}>
                  Donasi poin untuk organisasi global dikumpulkan oleh Eco-Donation dan disalurkan melalui Every.org secara berkala.
                </Text>
              </View>
            </>
          )}
        </View>
      </Screen>

      <DonateSheet
        visible={donate.open}
        title={org?.name || ''}
        balance={user?.points || 0}
        minimum={min_donation}
        loading={donate.loading}
        onClose={() => donate.setOpen(false)}
        onSubmit={donate.submit}
      />
      <Dialog
        visible={donate.success !== null}
        tone="success"
        icon="heart"
        title="Terima kasih!"
        message={`Donasi ${formatNumber(donate.success)} poin untuk ${org?.name} berhasil dicatat.`}
        confirmLabel="Selesai"
        onConfirm={donate.clearSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: -spacing.xxl,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  head: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  logo: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1 },
  title: { marginTop: spacing.sm },
  statsCard: { marginTop: spacing.xl, padding: spacing.xl },
  rule: { marginVertical: spacing.lg },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md },
  more: { marginTop: spacing.sm },
  info: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl, padding: spacing.md + 2,
    borderRadius: 14, backgroundColor: colors.surfaceAlt,
  },
});
