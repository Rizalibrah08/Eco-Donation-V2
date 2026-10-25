import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, colors, fonts, spacing, Icon } from '../ui';

// Kepala layar masuk: tanda merek kecil di kiri atas, lalu judul dan subjudul. Tanpa gradien.
export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Icon name="bicycle-outline" size={20} color={colors.onPrimary} />
        </View>
        <View>
          <Text variant="heading">Eco-Donation</Text>
          <Text variant="caption" tone="muted">Kurir</Text>
        </View>
      </View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text tone="muted" style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 40,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: { marginTop: spacing.sm },
});
