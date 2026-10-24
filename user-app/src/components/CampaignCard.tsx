import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Pill, ProgressBar, Text, colors, radius, spacing } from '../ui';
import { compactNumber, daysLeft, formatRupiah } from '../lib/format';
import type { Campaign } from '../lib/types';

export function CampaignCard({ campaign, onPress, compact }: { campaign: Campaign; onPress: () => void; compact?: boolean }) {
  const progress = campaign.target_amount ? campaign.collected_amount / campaign.target_amount : 0;
  const left = daysLeft(campaign.deadline);
  return (
    <Card padded={false} onPress={onPress} style={[styles.card, compact && styles.compact]} accessibilityLabel={campaign.title}>
      <View>
        <Image source={{ uri: campaign.image_url || undefined }} style={[styles.image, compact && styles.imageCompact]} />
        <View style={styles.badges}>
          <Pill label={campaign.category} tone="primary" style={styles.onImage} />
          {!!campaign.is_urgent && <Pill label="Mendesak" tone="danger" icon="flash" />}
        </View>
      </View>
      <View style={styles.body}>
        <Text variant="subheading" numberOfLines={2}>{campaign.title}</Text>
        <View style={styles.org}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text variant="caption" tone="muted" numberOfLines={1}>{campaign.organizer}</Text>
        </View>
        <ProgressBar value={progress} style={styles.progress} />
        <View style={styles.meta}>
          <View>
            <Text variant="caption" tone="subtle">Terkumpul</Text>
            <Text variant="bodySmall" weight="700">{formatRupiah(campaign.collected_amount)}</Text>
          </View>
          <View style={styles.right}>
            <Text variant="caption" tone="subtle">{left !== null && left >= 0 ? 'Sisa waktu' : 'Donatur'}</Text>
            <Text variant="bodySmall" weight="700">
              {left !== null && left >= 0 ? `${left} hari` : compactNumber(campaign.donor_count)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', marginBottom: spacing.md },
  compact: { width: 260, marginBottom: 0 },
  image: { width: '100%', height: 150, backgroundColor: colors.surfaceAlt },
  imageCompact: { height: 120 },
  badges: { position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', gap: spacing.xs + 2 },
  onImage: { backgroundColor: 'rgba(255,255,255,0.92)' },
  body: { padding: spacing.lg },
  org: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  progress: { marginTop: spacing.md, borderRadius: radius.pill },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  right: { alignItems: 'flex-end' },
});
