import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing } from './theme';
import { Text } from './Text';
import { IconButton } from './IconButton';

interface AppBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}

export function AppBar({ title, subtitle, back = true, onBack, right, transparent }: AppBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + spacing.sm },
        transparent ? styles.transparent : styles.solid,
      ]}
    >
      <View style={styles.side}>
        {back && <IconButton icon="chevron-back" accessibilityLabel="Kembali" onPress={handleBack} />}
      </View>
      <View style={styles.center}>
        <Text variant="heading" numberOfLines={1} align="center">{title}</Text>
        {subtitle && <Text variant="caption" tone="muted" numberOfLines={1} align="center">{subtitle}</Text>}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  solid: { backgroundColor: colors.bg },
  transparent: { backgroundColor: 'transparent' },
  side: { width: 48 },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
});
