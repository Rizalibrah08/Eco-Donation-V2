import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import api, { getErrorCode, getErrorMessage } from '../services/api';
import { refreshMe } from '../services/user';
import {
  AppBar, Button, Card, Chip, Dialog, Divider, EmptyState, IconButton, Input, Screen, Skeleton, Text,
  colors, radius, spacing, toast,
} from '../ui';
import { CATEGORY_META } from '../lib/status';
import { formatNumber } from '../lib/format';
import type { PickupOrder, VerificationSummary } from '../lib/types';

type Step = 'scan' | 'manual' | 'review' | 'success';

interface ApproveResult {
  points_earned: number;
  total_kg: number;
  co2: number;
  balance: number;
}

const CODE_LENGTH = 6;

// QR kurir berisi `ecodonation://verify?order=ID&code=CODE`. Diurai dengan regex
// karena kelas URL tidak menangani skema kustom secara konsisten di React Native.
function parseQr(data: string): { orderId: number; code: string } | null {
  if (!data.startsWith('ecodonation://verify')) return null;
  const order = data.match(/[?&]order=(\d+)/);
  const code = data.match(/[?&]code=([A-Za-z0-9]+)/);
  if (!order || !code) return null;
  return { orderId: Number(order[1]), code: code[1].toUpperCase() };
}

function useCountdown(expiresAt: string | null | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

export default function ScanScreen() {
  const params = useLocalSearchParams<{ order?: string }>();
  const router = useRouter();
  const [step, setStep] = useState<Step>('scan');
  const [orderId, setOrderId] = useState<number | null>(params.order ? Number(params.order) : null);
  const [code, setCode] = useState('');
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [result, setResult] = useState<ApproveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const openReview = useCallback(async (id: number, value: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<VerificationSummary>(`/pickups/${id}/verification`);
      setOrderId(id);
      setCode(value);
      setSummary(data);
      setCodeError(null);
      setStep('review');
    } catch (err) {
      toast.error('Tidak dapat memuat verifikasi', getErrorMessage(err));
      setStep((s) => (s === 'scan' ? 'scan' : 'manual'));
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data } = await api.post<ApproveResult>(`/pickups/${orderId}/approve`, { code });
      setResult(data);
      setStep('success');
      refreshMe();
    } catch (err) {
      const errCode = getErrorCode(err);
      if (errCode === 'INVALID_CODE') {
        const left = (err as { response?: { data?: { error?: { remaining_attempts?: number } } } })
          .response?.data?.error?.remaining_attempts;
        setCodeError(`Kode tidak cocok.${left != null ? ` Sisa ${left} percobaan.` : ''}`);
        setCode('');
        setStep('manual');
      } else if (errCode === 'CODE_EXPIRED' || errCode === 'CODE_LOCKED') {
        setBlocked(getErrorMessage(err));
      } else {
        toast.error('Gagal menyetujui', getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!orderId) return;
    setRejecting(true);
    try {
      await api.post(`/pickups/${orderId}/reject`, reason.trim() ? { reason: reason.trim() } : {});
      setRejectOpen(false);
      toast.info('Hasil timbangan ditolak', 'Kurir akan menimbang ulang sampah Anda.');
      router.replace(`/pickup/${orderId}`);
    } catch (err) {
      toast.error('Gagal menolak', getErrorMessage(err));
    } finally {
      setRejecting(false);
    }
  };

  const backToScan = () => {
    setBlocked(null);
    setSummary(null);
    setCode('');
    setStep('scan');
  };

  if (step === 'scan') {
    return (
      <ScannerView
        busy={loading}
        onScanned={(id, value) => openReview(id, value)}
        onManual={() => setStep('manual')}
      />
    );
  }

  if (step === 'manual') {
    return (
      <ManualEntry
        orderId={orderId}
        onOrderChange={setOrderId}
        error={codeError}
        loading={loading}
        onBack={() => { setCodeError(null); setStep('scan'); }}
        onSubmit={(id, value) => openReview(id, value)}
      />
    );
  }

  if (step === 'success' && result) {
    return (
      <Screen scroll={false}>
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={colors.onPrimary} />
          </View>
          <Text variant="title" align="center">Setoran berhasil!</Text>
          <Text tone="muted" align="center" style={styles.successMsg}>
            Terima kasih telah memilah sampah. Poin sudah masuk ke saldo Anda.
          </Text>
          <Text variant="display" tone="primary" align="center" style={styles.successPoints}>
            +{formatNumber(result.points_earned)}
          </Text>
          <Text variant="caption" tone="subtle" align="center">POIN DITERIMA</Text>
          <Card style={styles.successStats}>
            <Stat icon="scale-outline" label="Berat" value={`${formatNumber(result.total_kg, 2)} kg`} />
            <View style={styles.statDivider} />
            <Stat icon="leaf-outline" label="CO₂ dicegah" value={`${formatNumber(result.co2, 2)} kg`} />
            <View style={styles.statDivider} />
            <Stat icon="wallet-outline" label="Saldo" value={formatNumber(result.balance)} />
          </Card>
        </View>
        <View style={styles.successActions}>
          <Button title="Donasikan poin" icon="heart" size="lg" onPress={() => router.replace('/(tabs)/katalog')} />
          <Button title="Lihat detail penjemputan" variant="ghost"
            onPress={() => router.replace(`/pickup/${orderId}`)} />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen
        header={<AppBar title="Periksa hasil timbangan" subtitle={orderId ? `Penjemputan #${orderId}` : undefined}
          onBack={backToScan} />}
        footer={summary ? (
          <View style={styles.footerRow}>
            <Button title="Tolak" variant="outline" icon="close" onPress={() => setRejectOpen(true)}
              disabled={loading} style={styles.flex} />
            <Button title="Setujui" icon="checkmark" onPress={approve} loading={loading} style={styles.flex2} />
          </View>
        ) : undefined}
      >
        {summary ? <ReviewBody summary={summary} /> : (
          <>
            <Skeleton height={140} radius={radius.lg} />
            <Skeleton height={200} radius={radius.lg} style={{ marginTop: spacing.md }} />
          </>
        )}
      </Screen>

      <Dialog
        visible={rejectOpen}
        tone="warning"
        icon="alert-circle"
        title="Tolak hasil timbangan?"
        message="Kurir akan diminta menimbang ulang sampah Anda."
        cancelLabel="Batal"
        confirmLabel="Ya, tolak"
        destructive
        loading={rejecting}
        onCancel={() => setRejectOpen(false)}
        onConfirm={reject}
      >
        <Input
          placeholder="Alasan (opsional), mis. berat kertas kurang"
          value={reason}
          onChangeText={setReason}
          maxLength={200}
          containerStyle={styles.reason}
        />
      </Dialog>

      <Dialog
        visible={!!blocked}
        tone="danger"
        icon="time"
        title="Kode tidak berlaku"
        message={blocked || undefined}
        confirmLabel="Pindai ulang"
        onConfirm={backToScan}
      />
    </>
  );
}

function ReviewBody({ summary }: { summary: VerificationSummary }) {
  const seconds = useCountdown(summary.expires_at);
  const expired = seconds === 0;

  return (
    <>
      <Card style={styles.totalCard}>
        <Text variant="overline" style={styles.totalLabel}>Total poin untuk Anda</Text>
        <Text variant="display" style={styles.totalPoints}>{formatNumber(summary.total_points)}</Text>
        <View style={styles.totalMeta}>
          <Text variant="bodySmall" style={styles.totalSub}>{formatNumber(summary.total_kg, 2)} kg sampah</Text>
          <Text variant="bodySmall" style={styles.totalSub}>• {formatNumber(summary.co2, 2)} kg CO₂ dicegah</Text>
        </View>
      </Card>

      {seconds != null && (
        <View style={[styles.timer, expired && styles.timerExpired]}>
          <Ionicons name="time-outline" size={16} color={expired ? colors.danger : colors.warning} />
          <Text variant="bodySmall" weight="600" style={{ color: expired ? colors.danger : colors.warning }}>
            {expired
              ? 'Kode sudah kedaluwarsa. Minta kurir membuat kode baru.'
              : `Kode berlaku ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} lagi`}
          </Text>
        </View>
      )}

      <Card style={styles.block} padded={false}>
        <View style={styles.blockHead}>
          <Text variant="subheading">Rincian timbangan</Text>
          {summary.courier_name && <Text variant="caption" tone="subtle">oleh {summary.courier_name}</Text>}
        </View>
        {summary.items.map((item, i) => {
          const meta = CATEGORY_META[item.category];
          const diff = item.actual_weight != null ? item.actual_weight - item.estimated_weight : 0;
          return (
            <View key={item.id}>
              {i > 0 && <Divider style={styles.inset} />}
              <View style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: (meta?.color || colors.primary) + '18' }]}>
                  <Ionicons name={meta?.icon || 'cube'} size={18} color={meta?.color || colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text variant="subheading">{item.category}</Text>
                  <Text variant="caption" tone="subtle">
                    Estimasi {formatNumber(item.estimated_weight, 1)} kg
                    {diff !== 0 ? ` (${diff > 0 ? '+' : ''}${formatNumber(diff, 2)})` : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="subheading">{formatNumber(item.actual_weight ?? 0, 2)} kg</Text>
                  <Text variant="caption" tone="primary">+{formatNumber(item.points)} poin</Text>
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text variant="bodySmall" tone="muted" style={styles.flex}>
          Periksa berat bersama kurir. Tekan Setujui bila sudah sesuai, atau Tolak agar kurir menimbang ulang.
        </Text>
      </View>
    </>
  );
}

function ScannerView({ busy, onScanned, onManual }: {
  busy: boolean;
  onScanned: (orderId: number, code: string) => void;
  onManual: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const locked = useRef(false);

  useEffect(() => {
    if (!busy) locked.current = false;
  }, [busy]);

  const handleScan = ({ data }: { data: string }) => {
    if (locked.current) return;
    locked.current = true;
    const parsed = parseQr(data);
    if (!parsed) {
      toast.error('QR tidak dikenali', 'Pindai QR verifikasi yang tampil di aplikasi kurir.');
      setTimeout(() => { locked.current = false; }, 2500);
      return;
    }
    onScanned(parsed.orderId, parsed.code);
  };

  if (!permission) {
    return <View style={styles.camera} />;
  }

  if (!permission.granted) {
    return (
      <Screen header={<AppBar title="Pindai QR kurir" />} scroll={false}>
        <EmptyState
          icon="camera-outline"
          title="Izinkan akses kamera"
          message="Kamera dipakai untuk memindai QR verifikasi di HP kurir. Anda juga bisa memasukkan kode secara manual."
          actionLabel={permission.canAskAgain ? 'Izinkan kamera' : undefined}
          onAction={permission.canAskAgain ? requestPermission : undefined}
        />
        <Button title="Masukkan kode manual" variant="ghost" icon="keypad-outline" onPress={onManual} />
      </Screen>
    );
  }

  return (
    <View style={styles.camera}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : handleScan}
      />
      <View style={[styles.cameraTop, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="close" variant="glass" accessibilityLabel="Tutup"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <Text variant="heading" tone="inverse">Pindai QR kurir</Text>
        <IconButton icon={torch ? 'flash' : 'flash-outline'} variant="glass" accessibilityLabel="Senter"
          onPress={() => setTorch((t) => !t)} />
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text variant="body" tone="inverse" align="center" style={styles.frameHint}>
          {busy ? 'Memeriksa kode…' : 'Arahkan kamera ke QR yang tampil di HP kurir'}
        </Text>
      </View>

      <View style={[styles.cameraBottom, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Button title="Masukkan kode manual" variant="outline" icon="keypad-outline" onPress={onManual} />
      </View>
    </View>
  );
}

function ManualEntry({ orderId, onOrderChange, error, loading, onBack, onSubmit }: {
  orderId: number | null;
  onOrderChange: (id: number) => void;
  error: string | null;
  loading: boolean;
  onBack: () => void;
  onSubmit: (orderId: number, code: string) => void;
}) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState<PickupOrder[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tanpa nomor order dari layar sebelumnya → cari order yang menunggu persetujuan.
  const loadPending = useCallback(async () => {
    try {
      const { data } = await api.get<PickupOrder[]>('/pickups', { params: { status: 'pending_verification' } });
      setPending(data);
      setLoadError(null);
      if (data.length === 1) onOrderChange(data[0].id);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    }
  }, [onOrderChange]);

  useEffect(() => {
    if (orderId == null) loadPending();
  }, [orderId, loadPending]);

  const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const canSubmit = orderId != null && clean.length === CODE_LENGTH;

  let body: React.ReactNode;
  if (orderId == null && loadError) {
    body = <EmptyState icon="alert-circle-outline" title="Tidak dapat memuat" message={loadError}
      actionLabel="Coba lagi" onAction={loadPending} />;
  } else if (orderId == null && pending === null) {
    body = <Skeleton height={120} radius={radius.lg} />;
  } else if (orderId == null && pending?.length === 0) {
    body = <EmptyState icon="hourglass-outline" title="Belum ada yang perlu disetujui"
      message="Kode verifikasi muncul setelah kurir selesai menimbang sampah Anda." />;
  } else {
    body = (
      <>
        {pending && pending.length > 1 && (
          <View style={styles.block}>
            <Text variant="bodySmall" weight="600" style={styles.label}>Pilih penjemputan</Text>
            <View style={styles.chips}>
              {pending.map((p) => (
                <Chip key={p.id} label={`#${p.id}`} selected={orderId === p.id} onPress={() => onOrderChange(p.id)} />
              ))}
            </View>
          </View>
        )}
        <Card style={styles.block}>
          <Text variant="subheading">Kode verifikasi</Text>
          <Text variant="bodySmall" tone="muted" style={styles.manualHint}>
            Masukkan {CODE_LENGTH} karakter yang tampil di bawah QR pada HP kurir.
          </Text>
          <Input
            value={value}
            onChangeText={(t) => setValue(t.toUpperCase())}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={CODE_LENGTH}
            error={error}
            style={styles.codeInput}
            returnKeyType="done"
            onSubmitEditing={() => canSubmit && onSubmit(orderId!, clean)}
          />
        </Card>
      </>
    );
  }

  return (
    <Screen
      header={<AppBar title="Masukkan kode" subtitle={orderId ? `Penjemputan #${orderId}` : undefined} onBack={onBack} />}
      footer={
        <Button title="Lanjutkan" iconRight="arrow-forward" disabled={!canSubmit} loading={loading}
          onPress={() => onSubmit(orderId!, clean)} />
      }
    >
      {body}
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text variant="subheading" style={styles.statValue}>{value}</Text>
      <Text variant="caption" tone="subtle">{label}</Text>
    </View>
  );
}

const CORNER = 28;
const FRAME = 240;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  block: { marginTop: spacing.md },
  label: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  manualHint: { marginTop: spacing.xs, marginBottom: spacing.md },
  codeInput: { fontSize: 24, letterSpacing: 8, fontWeight: '700', textAlign: 'center' },
  reason: { alignSelf: 'stretch', marginTop: spacing.lg },

  totalCard: { backgroundColor: colors.primary, borderColor: colors.primary, alignItems: 'center', paddingVertical: spacing.xxl },
  totalLabel: { color: 'rgba(255,255,255,0.8)' },
  totalPoints: { color: colors.onPrimary, fontSize: 44, lineHeight: 52, marginTop: spacing.xs },
  totalMeta: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  totalSub: { color: 'rgba(255,255,255,0.85)' },
  timer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md,
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSoft,
  },
  timerExpired: { backgroundColor: colors.dangerSoft },
  blockHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  itemIcon: { width: 36, height: 36, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  inset: { marginLeft: spacing.lg + 36 + spacing.md },
  right: { alignItems: 'flex-end' },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xs },

  camera: { flex: 1, backgroundColor: '#000' },
  cameraTop: {
    position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.lg,
  },
  frameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME, height: FRAME },
  frameHint: { marginTop: spacing.xxl, paddingHorizontal: spacing.xxxl },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.md },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.md },
  cameraBottom: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 0 },

  success: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  successMsg: { marginTop: spacing.xs, maxWidth: 300 },
  successPoints: { marginTop: spacing.xxl, fontSize: 48, lineHeight: 56 },
  successStats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: spacing.xxl },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  statValue: { marginTop: spacing.xs },
  statDivider: { width: 1, backgroundColor: colors.border },
  successActions: { gap: spacing.sm, paddingBottom: spacing.xl },
});
