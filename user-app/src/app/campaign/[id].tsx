import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { useRates } from '../../hooks/useRates';
import { useDonate } from '../../hooks/useDonate';
import { HeroHeader } from '../../components/HeroHeader';
import { DonateSheet } from '../../components/DonateSheet';
import {
  Button, Card, Dialog, Divider, EmptyState, Pill, ProgressBar, Screen, Skeleton, Text, colors, radius, spacing, Icon } from '../../ui';
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
          <Button title="Donasi sekarang" icon="heart-outline" size="lg" disabled={!campaign} onPress={() => donate.setOpen(true)} />
        }
      >
        <HeroHeader imageUrl={campaign?.image_url || null} />
        <View style={styles.body}>
          {!campaign ? (
            <>
              <Skeleton width="40%" height={20} />
              <Skeleton height={28} style={{ marginTop: spacing.md }} />
              <Skeleton height={160} radius={radius.card} style={{ marginTop: spacing.xl }} />
            </>
          ) : (
            <>
              <View style={styles.pills}>
                <Pill label={campaign.category} tone="neutral" />
                {!!campaign.is_urgent && <Pill label="Mendesak" tone="danger" />}
              </View>
              <Text variant="title" style={styles.title}>{campaign.title}</Text>
              <View style={styles.org}>
                <Icon name="shield-checkmark-outline" size={16} color={colors.textMuted} />
                <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.shrink}>{campaign.organizer}</Text>
                {campaign.location && (
                  <>
                    <Text variant="bodySmall" tone="subtle">·</Text>
                    <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>{campaign.location}</Text>
                  </>
                )}
              </View>

              <Card style={styles.progressCard}>
                <View style={styles.amountRow}>
                  <View style={styles.flex}>
                    <Text variant="display" tabular numberOfLines={1} adjustsFontSizeToFit>
                      {formatRupiah(campaign.collected_amount)}
                    </Text>
                    <Text variant="bodySmall" tone="muted" tabular>
                      terkumpul dari target {formatRupiah(campaign.target_amount)}
                    </Text>
                  </View>
                  <Text variant="heading" tone="primary" tabular>{Math.round(progress * 100)}%</Text>
                </View>
                <ProgressBar value={progress} height={8} color={colors.primaryData} style={styles.bar} />
                <Divider style={styles.rule} />
                <View style={styles.stats}>
                  <Stat value={compactNumber(campaign.donor_count)} label="Donatur" />
                  <View style={styles.vRule} />
                  <Stat value={left !== null && left >= 0 ? `${left} hari` : 'Berakhir'} label="Sisa waktu" />
                  <View style={styles.vRule} />
                  <Stat value={campaign.deadline ? formatDate(campaign.deadline, false) : '-'} label="Batas" />
                </View>
              </Card>

              <Text variant="heading" style={styles.section}>Tentang kampanye</Text>
              <Text tone="muted">{campaign.description}</Text>

              {campaign.updates.length > 0 && (
                <>
                  <Text variant="heading" style={styles.section}>Kabar terbaru</Text>
                  <Card padded={false}>
                    {campaign.updates.map((u, i) => (
                      <View key={i} style={[styles.update, i > 0 && styles.updateRule]}>
                        <Text variant="caption" tone="muted">{formatDate(u.date)}</Text>
                        <Text variant="body" style={styles.updateText}>{u.text}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              )}

              <View style={styles.info}>
                <Icon name="information-circle-outline" size={18} color={colors.textMuted} />
                <Text variant="bodySmall" tone="muted" style={styles.flex}>
                  1 poin = Rp1. Poin yang Anda donasikan langsung menambah dana kampanye ini dan tercatat di riwayat Anda.
                </Text>
              </View>
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="bodySmall" weight="600" tabular numberOfLines={1}>{value}</Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>{label}</Text>
    </View>
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
  pills: { flexDirection: 'row', gap: spacing.sm },
  title: { marginTop: spacing.md },
  org: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.sm },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  progressCard: { marginTop: spacing.xl, padding: spacing.xl },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  bar: { marginTop: spacing.lg },
  rule: { marginVertical: spacing.lg },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs },
  vRule: { width: 1, backgroundColor: colors.rule },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md },
  update: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  updateRule: { borderTopWidth: 1, borderTopColor: colors.rule },
  updateText: { marginTop: 2 },
  info: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl, padding: spacing.md + 2,
    borderRadius: 14, backgroundColor: colors.surfaceAlt,
  },
});
