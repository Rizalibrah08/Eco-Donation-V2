import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import api, { getErrorCode, getErrorMessage } from '../services/api';
import { refreshMe } from '../services/user';
import {
  AppBar, Button, Card, CategoryTile, Chip, Dialog, Divider, EmptyState, IconButton, Input, Screen, Skeleton, Text,
  categoryStyle, colors, fonts, radius, spacing, toast, Icon } from '../ui';
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
            <Icon name="checkmark" size={36} color={colors.success} />
          </View>
          <Text variant="title" align="center" style={styles.successTitle}>Setoran berhasil</Text>
          <Text tone="muted" align="center" style={styles.successMsg}>
            Terima kasih telah memilah sampah. Poin sudah masuk ke saldo Anda.
          </Text>
          <Card style={styles.successCard}>
            <Text variant="bodySmall" tone="muted">Poin diterima</Text>
            <Text variant="display" tone="success" tabular style={styles.successPoints}>
              +{formatNumber(result.points_earned)}
            </Text>
            <Divider style={styles.successRule} />
            <View style={styles.stats}>
              <Stat label="Berat" value={`${formatNumber(result.total_kg, 2)} kg`} />
              <Stat label="CO₂ dicegah" value={`${formatNumber(result.co2, 2)} kg`} />
              <Stat label="Saldo baru" value={formatNumber(result.balance)} />
            </View>
          </Card>
        </View>
        <View style={styles.successActions}>
          <Button title="Donasikan poin" icon="heart-outline" size="lg" onPress={() => router.replace('/(tabs)/katalog')} />
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
            <Button title="Tolak" variant="secondary" icon="close-outline" onPress={() => setRejectOpen(true)}
              disabled={loading} style={styles.rejectBtn} />
            <Button title="Setujui" icon="checkmark" onPress={approve} loading={loading} style={styles.flex} />
          </View>
        ) : undefined}
      >
        {summary ? <ReviewBody summary={summary} /> : (
          <>
            <Skeleton height={140} radius={radius.card} />
            <Skeleton height={200} radius={radius.card} style={{ marginTop: spacing.lg }} />
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
  const totalEstimate = summary.items.reduce((s, i) => s + i.estimated_weight, 0);

  return (
    <>
      <Card style={styles.totalCard}>
        <Text variant="bodySmall" tone="muted">Poin yang akan Anda terima</Text>
        <View style={styles.totalRow}>
          <Text variant="display" tone="success" tabular>+{formatNumber(summary.total_points)}</Text>
          <Text tone="muted">poin</Text>
        </View>
        <Text variant="bodySmall" tone="muted" tabular>
          {formatNumber(summary.total_kg, 2)} kg sampah · {formatNumber(summary.co2, 2)} kg CO₂ dicegah
        </Text>
      </Card>

      {seconds != null && (
        <View style={[styles.timer, expired && styles.timerExpired]}>
          <Icon name="time-outline" size={18} color={expired ? colors.danger : colors.warning} />
          <Text variant="bodySmall" weight="500" tabular style={[styles.flex, { color: expired ? colors.danger : colors.warning }]}>
            {expired
              ? 'Kode sudah kedaluwarsa. Minta kurir membuat kode baru.'
              : `Kode berlaku ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} lagi`}
          </Text>
        </View>
      )}

      <Card style={styles.receipt}>
        <View style={styles.receiptHead}>
          <Text variant="heading">Rincian timbangan</Text>
          {summary.courier_name && <Text variant="caption" tone="muted" numberOfLines={1}>oleh {summary.courier_name}</Text>}
        </View>

        <View style={[styles.tr, styles.thead]}>
          <Text variant="caption" tone="muted" style={styles.flex}>Kategori</Text>
          <Text variant="caption" tone="muted" style={styles.num}>Estimasi</Text>
          <Text variant="caption" tone="muted" style={styles.num}>Aktual</Text>
          <Text variant="caption" tone="muted" style={styles.num}>Poin</Text>
        </View>

        {summary.items.map((item, i) => (
          <View key={item.id} style={[styles.tr, styles.trow, i > 0 && styles.trowRule]}>
            <View style={styles.cellCat}>
              <CategoryTile name={item.category} size={32} />
              <Text variant="bodySmall" numberOfLines={1} style={styles.flex}>{categoryStyle(item.category).short}</Text>
            </View>
            <Text variant="bodySmall" tone="muted" tabular style={styles.num}>{formatNumber(item.estimated_weight, 1)} kg</Text>
            <Text variant="bodySmall" weight="600" tabular style={styles.num}>{formatNumber(item.actual_weight ?? 0, 2)} kg</Text>
            <Text variant="bodySmall" tone="success" tabular style={styles.num}>+{formatNumber(item.points)}</Text>
          </View>
        ))}

        <View style={[styles.tr, styles.ttotal]}>
          <Text variant="bodySmall" weight="600" style={styles.flex}>Total</Text>
          <Text variant="bodySmall" tone="muted" tabular style={styles.num}>{formatNumber(totalEstimate, 1)} kg</Text>
          <Text variant="bodySmall" weight="600" tabular style={styles.num}>{formatNumber(summary.total_kg, 2)} kg</Text>
          <Text variant="bodySmall" weight="600" tone="success" tabular style={styles.num}>+{formatNumber(summary.total_points)}</Text>
        </View>
      </Card>

      <View style={styles.note}>
        <Icon name="information-circle-outline" size={18} color={colors.textMuted} />
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
          <View style={[styles.corner, styles.tr_]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text variant="body" tone="inverse" align="center" style={styles.frameHint}>
          {busy ? 'Memeriksa kode…' : 'Arahkan kamera ke QR yang tampil di HP kurir'}
        </Text>
      </View>

      <View style={[styles.cameraBottom, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Pressable accessibilityRole="button" onPress={onManual}
          style={({ pressed }) => [styles.manualBtn, pressed && styles.manualBtnPressed]}>
          <Icon name="keypad-outline" size={18} color="#FFFFFF" />
          <Text variant="subheading" tone="inverse">Masukkan kode manual</Text>
        </Pressable>
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
    body = <Skeleton height={120} radius={radius.card} />;
  } else if (orderId == null && pending?.length === 0) {
    body = <EmptyState icon="hourglass-outline" title="Belum ada yang perlu disetujui"
      message="Kode verifikasi muncul setelah kurir selesai menimbang sampah Anda." />;
  } else {
    body = (
      <>
        {pending && pending.length > 1 && (
          <View style={styles.block}>
            <Text variant="bodySmall" weight="500" style={styles.label}>Pilih penjemputan</Text>
            <View style={styles.chips}>
              {pending.map((p) => (
                <Chip key={p.id} label={`#${p.id}`} selected={orderId === p.id} onPress={() => onOrderChange(p.id)} />
              ))}
            </View>
          </View>
        )}
        <Card style={[styles.block, styles.manualCard]}>
          <Text variant="heading">Kode verifikasi</Text>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="bodySmall" weight="600" tabular numberOfLines={1}>{value}</Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>{label}</Text>
    </View>
  );
}

const CORNER = 28;
const FRAME = 240;
const NUM_COL = 58;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  rejectBtn: { width: 110 },
  block: { marginTop: spacing.md },
  label: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  manualCard: { padding: spacing.xl },
  manualHint: { marginTop: spacing.xs, marginBottom: spacing.lg },
  codeInput: { fontSize: 24, letterSpacing: 8, fontFamily: fonts.bold, textAlign: 'center' },
  reason: { alignSelf: 'stretch', marginTop: spacing.lg },

  totalCard: { padding: spacing.xl },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xs },
  timer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg,
    paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md, borderRadius: 14, backgroundColor: colors.warningSoft,
  },
  timerExpired: { backgroundColor: colors.dangerSoft },
  receipt: { marginTop: spacing.lg, padding: spacing.lg },
  receiptHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md,
  },
  tr: { flexDirection: 'row', alignItems: 'center' },
  thead: { paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.rule },
  trow: { paddingVertical: spacing.md },
  trowRule: { borderTopWidth: 1, borderTopColor: colors.rule },
  ttotal: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderStrong },
  cellCat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minWidth: 0 },
  num: { width: NUM_COL, textAlign: 'right' },
  note: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md + 2,
    borderRadius: 14, backgroundColor: colors.surfaceAlt,
  },

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
  tr_: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.md },
  cameraBottom: { position: 'absolute', left: spacing.xxl, right: spacing.xxl, bottom: 0 },
  manualBtn: {
    height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  manualBtnPressed: { backgroundColor: 'rgba(255,255,255,0.24)' },

  success: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  successTitle: { fontSize: 28, lineHeight: 34 },
  successMsg: { marginTop: spacing.sm, maxWidth: 300 },
  successCard: { alignSelf: 'stretch', marginTop: spacing.xxl, padding: spacing.xl },
  successPoints: { marginTop: spacing.xs },
  successRule: { marginVertical: spacing.lg },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  successActions: { gap: spacing.sm, paddingBottom: spacing.xl },
});
