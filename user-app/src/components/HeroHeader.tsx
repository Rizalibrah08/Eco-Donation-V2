import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, colors, spacing } from '../ui';

// Gambar sampul penuh dengan tombol kembali melayang (dipakai di detail kampanye).
export function HeroHeader({ imageUrl, height = 260 }: { imageUrl: string | null; height?: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height }}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Ionicons name="earth" size={56} color={colors.primary} />
        </View>
      )}
      <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} style={styles.shade} />
      <View style={[styles.bar, { top: insets.top + spacing.sm }]}>
        <IconButton icon="chevron-back" accessibilityLabel="Kembali"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/katalog'))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', left: 0, right: 0, top: 0, height: 120 },
  bar: { position: 'absolute', left: spacing.lg },
});
