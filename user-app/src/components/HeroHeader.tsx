import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, colors, spacing, Icon } from '../ui';

// Gambar sampul penuh dengan tombol kembali melayang (dipakai di detail kampanye).
// Pita gelap setinggi status bar saja menjaga ikonnya terbaca di atas foto terang tanpa memotong foto.
export function HeroHeader({ imageUrl, height = 260 }: { imageUrl: string | null; height?: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height }}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Icon name="image-outline" size={48} color={colors.textSubtle} />
        </View>
      )}
      {insets.top > 0 && <View style={[styles.band, { height: insets.top }]} />}
      <View style={[styles.bar, { top: insets.top + spacing.sm }]}>
        <IconButton icon="chevron-back" accessibilityLabel="Kembali" size={40}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/katalog'))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  bar: { position: 'absolute', left: spacing.lg },
});
