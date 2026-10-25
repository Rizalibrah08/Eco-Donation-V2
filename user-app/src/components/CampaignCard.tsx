import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Card, Pill, ProgressBar, Text, colors, radius, spacing, Icon } from '../ui';
import { compactNumber, daysLeft, formatRupiah } from '../lib/format';
import type { Campaign } from '../lib/types';

export function CampaignCard({ campaign, onPress, compact }: { campaign: Campaign; onPress: () => void; compact?: boolean }) {
  const progress = campaign.target_amount ? campaign.collected_amount / campaign.target_amount : 0;
  const left = daysLeft(campaign.deadline);
  const timeLabel = left !== null && left >= 0 ? `${left} hari lagi` : 'Berakhir';
  return (
    <Card padded={false} onPress={onPress} style={[styles.card, compact && styles.compact]} accessibilityLabel={campaign.title}>
      <Image source={{ uri: campaign.image_url || undefined }} style={[styles.image, compact && styles.imageCompact]} />
      <View style={styles.body}>
        <View style={styles.badges}>
          <Pill label={campaign.category} tone="neutral" dot />
          {!!campaign.is_urgent && <Pill label="Mendesak" tone="danger" dot />}
        </View>
        <View style={styles.titleBlock}>
          <Text variant={compact ? 'subheading' : 'heading'} numberOfLines={2}>{campaign.title}</Text>
          {!compact && (
            <View style={styles.org}>
              <Icon name="shield-checkmark-outline" size={14} color={colors.textMuted} />
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {campaign.organizer}{campaign.location ? ` · ${campaign.location}` : ''}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.amountRow}>
          <View style={styles.amount}>
            <Text variant="bodySmall" weight="600" tabular>{formatRupiah(campaign.collected_amount)}</Text>
            {!compact && <Text variant="caption" tone="muted" numberOfLines={1}>dari {formatRupiah(campaign.target_amount)}</Text>}
          </View>
          <Text variant="bodySmall" weight="600" tone="primary" tabular>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar value={progress} height={6} color={colors.primaryData} />
        <View style={styles.meta}>
          {compact ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              dari {formatRupiah(campaign.target_amount)} · {campaign.organizer}
            </Text>
          ) : (
            <>
              <Text variant="caption" tone="muted">{compactNumber(campaign.donor_count)} donatur</Text>
              <Text variant="caption" tone="muted">{timeLabel}</Text>
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', marginBottom: spacing.lg },
  compact: { width: 256, marginBottom: 0 },
  image: { width: '100%', height: 150, backgroundColor: colors.surfaceAlt },
  imageCompact: { height: 128 },
  body: { padding: spacing.lg, gap: spacing.sm + 2 },
  badges: { flexDirection: 'row', gap: 6 },
  titleBlock: { gap: spacing.xs },
  org: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  amount: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flex: 1 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: radius.sm },
});
