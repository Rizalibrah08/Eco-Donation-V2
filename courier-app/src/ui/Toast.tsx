import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, radius, shadow, spacing } from './theme';
import { Text } from './Text';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  onPress?: () => void;
}

interface ToastState {
  current: ToastItem | null;
  show: (t: Omit<ToastItem, 'id'>) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (t) => set({ current: { ...t, id: Date.now() } }),
  hide: () => set({ current: null }),
}));

// Dapat dipanggil dari mana saja (termasuk di luar komponen).
export const toast = {
  success: (title: string, message?: string, onPress?: () => void) =>
    useToastStore.getState().show({ tone: 'success', title, message, onPress }),
  error: (title: string, message?: string) => useToastStore.getState().show({ tone: 'error', title, message }),
  info: (title: string, message?: string, onPress?: () => void) =>
    useToastStore.getState().show({ tone: 'info', title, message, onPress }),
};

const toneStyle: Record<ToastTone, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: 'checkmark-circle', color: colors.success },
  error: { icon: 'alert-circle', color: colors.danger },
  info: { icon: 'notifications', color: colors.primary },
};

export function ToastHost() {
  const { current, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!current) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    const timer = setTimeout(() => {
      Animated.timing(y, { toValue: -120, duration: 200, useNativeDriver: true }).start(() => hide());
    }, 4000);
    return () => clearTimeout(timer);
  }, [current, hide, y]);

  if (!current) return null;
  const t = toneStyle[current.tone];

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY: y }] }]}>
      <Pressable
        accessibilityRole="alert"
        onPress={() => {
          current.onPress?.();
          hide();
        }}
        style={styles.toast}
      >
        <View style={[styles.accent, { backgroundColor: t.color }]} />
        <Ionicons name={t.icon} size={22} color={t.color} />
        <View style={styles.body}>
          <Text variant="subheading" numberOfLines={1}>{current.title}</Text>
          {current.message && <Text variant="bodySmall" tone="muted" numberOfLines={2}>{current.message}</Text>}
        </View>
        <Ionicons name="close" size={18} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 1000, elevation: 20 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    ...shadow.lg,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  body: { flex: 1 },
});
