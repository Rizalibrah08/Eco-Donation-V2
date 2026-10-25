import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, colors, fonts, radius, spacing, Icon } from '../ui';

// Kepala layar masuk/daftar: tanda merek, judul, dan satu kalimat penjelas.
export function AuthHero({ title, subtitle, mark = true }: { title: string; subtitle: string; mark?: boolean }) {
  return (
    <View>
      {mark && (
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="leaf-outline" size={20} color={colors.onPrimary} />
          </View>
          <Text variant="heading">Eco-Donation</Text>
        </View>
      )}
      <Text variant="title" style={styles.title}>{title}</Text>
      <Text tone="muted" style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginBottom: spacing.xxxl + spacing.sm },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold },
  subtitle: { marginTop: spacing.sm },
});

export const authStyles = StyleSheet.create({
  alert: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
});
