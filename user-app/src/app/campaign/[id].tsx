import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { useRates } from '../../hooks/useRates';
import { useDonate } from '../../hooks/useDonate';
import { HeroHeader } from '../../components/HeroHeader';
import { DonateSheet } from '../../components/DonateSheet';
import {
  Button, Card, Dialog, EmptyState, Pill, ProgressBar, Screen, Skeleton, Text, colors, radius, spacing,
} from '../../ui';
import { compactNumber, daysLeft, formatDate, formatNumber, formatRupiah } from '../../lib/format';
import type { Campaign } from '../../lib/types';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { min_donation } = useRates();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Campaign>(`/campaigns/${id}`);
      setCampaign(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const donate = useDonate(campaign ? { campaign_id: campaign.id } : null, load);

  if (error) {
    return (
      <Screen padded={false} edgeToEdge>
        <HeroHeader imageUrl={null} height={200} />
        <EmptyState icon="alert-circle-outline" title="Kampanye tidak tersedia" message={error} actionLabel="Coba lagi" onAction={load} />
      </Screen>
    );
  }

  const progress = campaign?.target_amount ? campaign.collected_amount / campaign.target_amount : 0;
  const left = campaign ? daysLeft(campaign.deadline) : null;

  return (
    <>
      <Screen
        padded={false}
        edgeToEdge
        statusBar="light"
        footer={
          <Button title="Donasi Sekarang" icon="heart" size="lg" disabled={!campaign} onPress={() => donate.setOpen(true)} />
        }
      >
        <HeroHeader imageUrl={campaign?.image_url || null} />
        <View style={styles.body}>
          {!campaign ? (
            <>
              <Skeleton width="40%" height={20} />
              <Skeleton height={28} style={{ marginTop: spacing.md }} />
              <Skeleton height={120} radius={radius.lg} style={{ marginTop: spacing.xl }} />
            </>
          ) : (
            <>
              <View style={styles.pills}>
                <Pill label={campaign.category} tone="primary" />
                {!!campaign.is_urgent && <Pill label="Mendesak" tone="danger" icon="flash" />}
              </View>
              <Text variant="title" style={styles.title}>{campaign.title}</Text>
              <View style={styles.org}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text variant="bodySmall" tone="muted">{campaign.organizer}</Text>
                {campaign.location && (
                  <>
                    <Text tone="subtle">•</Text>
                    <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>{campaign.location}</Text>
                  </>
                )}
              </View>

              <Card style={styles.progressCard}>
                <View style={styles.amountRow}>
                  <Text variant="title" tone="primary">{formatRupiah(campaign.collected_amount)}</Text>
                  <Text variant="bodySmall" tone="muted">{Math.round(progress * 100)}%</Text>
                </View>
                <Text variant="bodySmall" tone="muted">terkumpul dari target {formatRupiah(campaign.target_amount)}</Text>
                <ProgressBar value={progress} height={10} style={styles.bar} />
                <View style={styles.stats}>
                  <Stat icon="people" value={compactNumber(campaign.donor_count)} label="Donatur" />
                  <Stat icon="time" value={left !== null && left >= 0 ? `${left} hari` : 'Berakhir'} label="Sisa waktu" />
                  <Stat icon="calendar" value={campaign.deadline ? formatDate(campaign.deadline, false) : '-'} label="Batas" />
                </View>
              </Card>

              <Text variant="heading" style={styles.section}>Tentang kampanye</Text>
              <Text tone="muted">{campaign.description}</Text>

              {campaign.updates.length > 0 && (
                <>
                  <Text variant="heading" style={styles.section}>Kabar terbaru</Text>
                  {campaign.updates.map((u, i) => (
                    <View key={i} style={styles.update}>
                      <View style={styles.updateDot} />
                      <View style={styles.flex}>
                        <Text variant="caption" tone="subtle">{formatDate(u.date)}</Text>
                        <Text variant="bodySmall">{u.text}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <Card style={styles.info}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text variant="bodySmall" tone="muted" style={styles.flex}>
                  1 poin = Rp1. Poin yang Anda donasikan langsung menambah dana kampanye ini dan tercatat di riwayat Anda.
                </Text>
              </Card>
            </>
          )}
        </View>
      </Screen>

      <DonateSheet
        visible={donate.open}
        title={campaign?.title || ''}
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
        message={`Donasi ${formatNumber(donate.success)} poin untuk "${campaign?.title}" berhasil disalurkan.`}
        confirmLabel="Selesai"
        onConfirm={donate.clearSuccess}
      />
    </>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.textSubtle} />
      <Text variant="subheading">{value}</Text>
      <Text variant="caption" tone="subtle">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: -spacing.xl,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  pills: { flexDirection: 'row', gap: spacing.sm },
  title: { marginTop: spacing.md },
  org: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.sm },
  flex: { flex: 1 },
  progressCard: { marginTop: spacing.xl },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bar: { marginTop: spacing.md },
  stats: { flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  section: { marginTop: spacing.xxl, marginBottom: spacing.sm },
  update: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  updateDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
  info: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl, backgroundColor: colors.infoSoft, borderColor: colors.infoSoft },
});
