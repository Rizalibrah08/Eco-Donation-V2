import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, colors, radius, spacing } from '../ui';

// Header bergradien untuk layar masuk/daftar.
export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.circleA} />
      <View style={styles.circleB} />
      <View style={styles.logo}>
        <Ionicons name="leaf" size={28} color={colors.primary} />
      </View>
      <Text variant="overline" style={styles.brand}>Eco-Donation</Text>
      <Text variant="display" tone="inverse">{title}</Text>
      <Text tone="inverse" style={styles.subtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl + spacing.xl,
    overflow: 'hidden',
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  brand: { color: 'rgba(255,255,255,0.75)', marginBottom: spacing.xs },
  subtitle: { opacity: 0.85, marginTop: spacing.xs },
  circleA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -60,
    top: -40,
  },
  circleB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: 60,
    bottom: -70,
  },
});
