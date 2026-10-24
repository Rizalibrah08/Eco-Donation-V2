import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from './theme';
import { Text } from './Text';
import { Button } from './Button';

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'primary';

const toneStyle: Record<Tone, { icon: keyof typeof Ionicons.glyphMap; fg: string; bg: string }> = {
  success: { icon: 'checkmark-circle', fg: colors.success, bg: colors.successSoft },
  danger: { icon: 'alert-circle', fg: colors.danger, bg: colors.dangerSoft },
  warning: { icon: 'warning', fg: colors.warning, bg: colors.warningSoft },
  info: { icon: 'information-circle', fg: colors.info, bg: colors.infoSoft },
  primary: { icon: 'help-circle', fg: colors.primary, bg: colors.primarySoft },
};

export interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  destructive?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export function Dialog({
  visible,
  title,
  message,
  tone = 'primary',
  icon,
  confirmLabel = 'Oke',
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
  loading,
  children,
}: DialogProps) {
  const t = toneStyle[tone];
  const dismiss = onCancel || onConfirm;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={loading ? undefined : dismiss} accessibilityLabel="Tutup dialog">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
            <Ionicons name={icon || t.icon} size={30} color={t.fg} />
          </View>
          <Text variant="title" align="center" style={styles.title}>{title}</Text>
          {message && <Text tone="muted" align="center">{message}</Text>}
          {children}
          <View style={styles.actions}>
            {cancelLabel && onCancel && (
              <Button title={cancelLabel} variant="outline" onPress={onCancel} disabled={loading} style={styles.flex} />
            )}
            {onConfirm && (
              <Button
                title={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                onPress={onConfirm}
                loading={loading}
                style={styles.flex}
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadow.lg,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl, alignSelf: 'stretch' },
  flex: { flex: 1 },
});
