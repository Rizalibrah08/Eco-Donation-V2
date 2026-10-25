import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Card, Pill, Text, colors, radius, spacing, Icon } from '../ui';
import type { GlobalNonprofit } from '../services/everyOrg';

export function GlobalCard({ item, onPress }: { item: GlobalNonprofit; onPress: () => void }) {
  return (
    <Card padded={false} onPress={onPress} style={styles.card} accessibilityLabel={item.name}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Icon name="earth-outline" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.head}>
          {item.logoUrl && <Image source={{ uri: item.logoUrl }} style={styles.logo} />}
          <View style={styles.flex}>
            <Text variant="heading" numberOfLines={2}>{item.name}</Text>
            {item.location && (
              <View style={styles.loc}>
                <Icon name="location-outline" size={13} color={colors.textMuted} />
                <Text variant="caption" tone="muted" numberOfLines={1}>{item.location}</Text>
              </View>
            )}
          </View>
        </View>
        <Text variant="bodySmall" tone="muted" numberOfLines={2} style={styles.desc}>{item.description}</Text>
        <Pill label="Every.org · terverifikasi" tone="neutral" icon="checkmark-circle-outline" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', marginBottom: spacing.lg },
  image: { width: '100%', height: 130, backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  body: { padding: spacing.lg },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  logo: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  desc: { marginVertical: spacing.md },
});
