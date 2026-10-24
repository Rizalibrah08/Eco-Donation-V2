import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Input, Text, colors, radius, spacing } from '../ui';
import { formatNumber, formatRupiah } from '../lib/format';

const PRESETS = [1000, 5000, 10000, 25000];

interface DonateSheetProps {
  visible: boolean;
  title: string;
  balance: number;
  minimum: number;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (points: number) => void;
}

export function DonateSheet({ visible, title, balance, minimum, loading, onClose, onSubmit }: DonateSheetProps) {
  const insets = useSafeAreaInsets();
  const [raw, setRaw] = useState('');
  useEffect(() => { if (visible) setRaw(''); }, [visible]);

  const amount = parseInt(raw.replace(/\D/g, ''), 10) || 0;
  const error =
    raw === '' ? null
      : amount < minimum ? `Minimal donasi ${formatNumber(minimum)} poin.`
        : amount > balance ? `Saldo tidak cukup. Saldo Anda ${formatNumber(balance)} poin.`
          : null;
  const canSubmit = amount >= minimum && amount <= balance;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Tutup" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <Text variant="title">Donasi poin</Text>
          <Text variant="bodySmall" tone="muted" numberOfLines={2} style={styles.sub}>Untuk {title}</Text>

          <View style={styles.balance}>
            <Text variant="bodySmall" tone="muted">Saldo Anda</Text>
            <Text variant="subheading">{formatNumber(balance)} poin</Text>
          </View>

          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Chip key={p} label={formatNumber(p)} selected={amount === p} disabled={p > balance}
                onPress={() => setRaw(String(p))} />
            ))}
            <Chip label="Semua" selected={amount === balance && balance > 0} disabled={balance < minimum}
              onPress={() => setRaw(String(balance))} />
          </View>

          <Input
            label="Jumlah poin"
            icon="leaf-outline"
            keyboardType="number-pad"
            placeholder={`Minimal ${formatNumber(minimum)}`}
            value={amount ? formatNumber(amount) : raw === '' ? '' : '0'}
            onChangeText={setRaw}
            error={error}
            hint={amount ? `Setara ${formatRupiah(amount)} donasi` : undefined}
          />

          <Button
            title={canSubmit ? `Donasikan ${formatNumber(amount)} poin` : 'Donasikan'}
            size="lg"
            disabled={!canSubmit}
            loading={loading}
            onPress={() => onSubmit(amount)}
            style={styles.cta}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.lg },
  sub: { marginTop: 2 },
  balance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.lg },
  cta: { marginTop: spacing.xl },
});
