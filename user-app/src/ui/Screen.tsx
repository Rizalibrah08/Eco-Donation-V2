import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from './theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  statusBar?: 'light' | 'dark';
  /** Isi menempel di bawah header tanpa safe-area atas (header sudah menanganinya). */
  edgeToEdge?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  header,
  footer,
  padded = true,
  background = colors.bg,
  refreshing,
  onRefresh,
  statusBar = 'dark',
  edgeToEdge = false,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const topPad = header || edgeToEdge ? 0 : insets.top;
  const inner = [padded && styles.padded, contentStyle];

  return (
    <View style={[styles.root, { backgroundColor: background, paddingTop: topPad }]}>
      <StatusBar style={statusBar} />
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[inner, { paddingBottom: (footer ? spacing.lg : insets.bottom + spacing.xxl) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, inner]}>{children}</View>
        )}
        {footer && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs }]}>{footer}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
