import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import api, { getErrorCode, getErrorMessage } from '../../services/api';
import { useSocketEvent } from '../../services/socket';
import { useLocationSharing, SharingState } from '../../hooks/useLocationSharing';
import { LeafletMap, MapMarker } from '../../components/LeafletMap';
import {
  AppBar, Avatar, Button, Card, Dialog, Divider, EmptyState, IconButton, Pill, Screen, Skeleton, Text,
  colors, radius, spacing, toast,
} from '../../ui';
import { CATEGORY_META, STATUS, mapsUrl, totalKg } from '../../lib/status';
import { formatDateTime, formatNumber, formatSchedule } from '../../lib/format';
import type { PickupOrder, VerificationCode } from '../../lib/types';

const STEP = 0.5;
const MAX_KG = 500;

const parseKg = (v: string) => Number(v.replace(',', '.'));

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [reweigh, setReweigh] = useState(false);
  const [verif, setVerif] = useState<VerificationCode | null>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const codeRequested = useRef(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PickupOrder>(`/pickups/${orderId}`);
      setOrder(data);
      setError(null);
      setWeights((w) => {
        const next = { ...w };
        for (const i of data.items) {
          if (next[i.id] === undefined) next[i.id] = String(i.actual_weight ?? i.estimated_weight);
        }
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent(['order:rejected', 'order:cancelled', 'order:completed', 'order:taken'], (p) => {
    if (p?.orderId !== orderId) return;
    setVerif(null);
    codeRequested.current = false;
    load();
  });

  const sharing = useLocationSharing(orderId, order?.status === 'on_the_way');

  const newCode = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.post<VerificationCode>(`/pickups/${orderId}/code`, {});
      setVerif(data);
    } catch (err) {
      toast.error('Gagal membuat kode', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [orderId]);

  // Kode hanya disimpan dalam bentuk hash di server, jadi saat layar dibuka ulang
  // pada status menunggu persetujuan, kurir otomatis membuat kode baru untuk ditampilkan.
  useEffect(() => {
    if (order?.status === 'pending_verification' && !verif && !reweigh && !codeRequested.current) {
      codeRequested.current = true;
      newCode();
    }
  }, [order?.status, verif, reweigh, newCode]);

  const run = async (action: () => Promise<void>, failTitle: string) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      if (getErrorCode(err) === 'ALREADY_TAKEN') {
        toast.error('Sudah diambil', 'Order ini sudah diambil kurir lain.');
        router.back();
      } else {
        toast.error(failTitle, getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const accept = () =>
    run(async () => {
      const { data } = await api.post<PickupOrder>(`/pickups/${orderId}/accept`, {});
      setOrder(data);
      toast.success('Tugas diambil', 'Lokasi Anda dibagikan ke pengguna selama perjalanan.');
    }, 'Gagal mengambil tugas');

  const arrive = () =>
    run(async () => {
      const { data } = await api.post<PickupOrder>(`/pickups/${orderId}/arrive`, {});
      setOrder(data);
    }, 'Gagal memperbarui status');

  const invalidWeight = order?.items.some((i) => {
    const v = parseKg(weights[i.id] ?? '');
    return !(v > 0 && v <= MAX_KG);
  });

  const weigh = () =>
    run(async () => {
      if (!order) return;
      const items = order.items.map((i) => ({ id: i.id, actual_weight: parseKg(weights[i.id]) }));
      const { data } = await api.post<VerificationCode>(`/pickups/${orderId}/weigh`, { items });
      setVerif(data);
      codeRequested.current = true;
      setReweigh(false);
      await load();
    }, 'Gagal menyimpan timbangan');

  const release = () =>
    run(async () => {
      await api.post(`/pickups/${orderId}/cancel`, {});
      setReleaseOpen(false);
      toast.info('Tugas dilepas', 'Order dikembalikan ke daftar tersedia.');
      router.back();
    }, 'Gagal melepas tugas');

  const markers = useMemo<MapMarker[]>(
    () => (order ? [{ id: 'pickup', kind: 'pickup', lat: order.pickup_lat, lng: order.pickup_lng }] : []),
    [order],
  );

  if (error && !order) {
    return (
      <Screen header={<AppBar title="Detail tugas" />}>
        <EmptyState icon="alert-circle-outline" title="Tidak dapat memuat" message={error} actionLabel="Coba lagi" onAction={load} />
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen header={<AppBar title="Detail tugas" />}>
        <Skeleton height={200} radius={radius.lg} />
        <Skeleton height={160} radius={radius.lg} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  const s = STATUS[order.status];
  const weighing = order.status === 'arrived' || (order.status === 'pending_verification' && reweigh);
  const showQr = order.status === 'pending_verification' && !reweigh;
  const showMap = order.status === 'waiting' || order.status === 'on_the_way';
  const canRelease = order.status === 'on_the_way' || order.status === 'arrived';

  let footer: React.ReactNode;
  if (order.status === 'waiting') {
    footer = <Button title="Ambil tugas ini" icon="hand-right" size="lg" loading={busy} onPress={accept} />;
  } else if (order.status === 'on_the_way') {
    footer = <Button title="Saya sudah tiba" icon="location" size="lg" loading={busy} onPress={arrive} />;
  } else if (weighing) {
    footer = (
      <Button title="Simpan & tampilkan QR" icon="qr-code" size="lg" loading={busy} disabled={invalidWeight}
        onPress={weigh} />
    );
  }

  return (
    <>
      <Screen
        header={
          <AppBar
            title={`Order #${order.id}`}
            subtitle={formatSchedule(order.scheduled_at)}
            right={canRelease ? (
              <IconButton icon="ellipsis-horizontal" accessibilityLabel="Lepas tugas" onPress={() => setReleaseOpen(true)} />
            ) : undefined}
          />
        }
        footer={footer}
      >
        <View style={styles.statusRow}>
          <Pill label={s.label} tone={s.tone} dot />
          {order.status === 'on_the_way' && <SharingBadge state={sharing} />}
        </View>

        {showQr && (
          <QrPanel verif={verif} busy={busy} onNewCode={newCode}
            onReweigh={() => { setReweigh(true); setVerif(null); }} />
        )}

        {order.status === 'completed' && (
          <Card style={[styles.block, styles.done]}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <View style={styles.flex}>
              <Text variant="subheading">Penjemputan selesai</Text>
              <Text variant="bodySmall" tone="muted">
                Disetujui pengguna{order.completed_at ? ` • ${formatDateTime(order.completed_at)}` : ''}
              </Text>
            </View>
          </Card>
        )}

        {showMap && (
          <View style={styles.mapWrap}>
            <LeafletMap center={{ lat: order.pickup_lat, lng: order.pickup_lng }} markers={markers} zoom={16}
              style={styles.map} interactive />
          </View>
        )}

        <Card style={styles.block}>
          <View style={styles.person}>
            <Avatar name={order.user_name} />
            <View style={styles.flex}>
              <Text variant="caption" tone="subtle">Pengguna</Text>
              <Text variant="subheading">{order.user_name || 'Pengguna'}</Text>
            </View>
            {order.user_phone && order.status !== 'waiting' && order.status !== 'completed' && (
              <IconButton icon="call" color={colors.primary} accessibilityLabel="Telepon pengguna"
                onPress={() => Linking.openURL(`tel:${order.user_phone}`)} />
            )}
          </View>
          <Divider style={{ marginVertical: spacing.md }} />
          <View style={styles.addr}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text variant="bodySmall" style={styles.flex}>{order.pickup_address}</Text>
          </View>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button title="Buka di Google Maps" icon="navigate" variant="secondary" size="sm" style={styles.nav}
              onPress={() => Linking.openURL(mapsUrl(order.pickup_lat, order.pickup_lng))} />
          )}
        </Card>

        <Card style={styles.block} padded={false}>
          <View style={styles.blockHead}>
            <Text variant="subheading">{weighing ? 'Timbang sampah' : 'Rincian sampah'}</Text>
            <Text variant="caption" tone="subtle">Total {formatNumber(totalKg(order.items), 1)} kg</Text>
          </View>
          {weighing && (
            <Text variant="bodySmall" tone="muted" style={styles.weighHint}>
              Masukkan berat aktual tiap kategori bersama pengguna.
            </Text>
          )}
          {order.items.map((item, i) => {
            const meta = CATEGORY_META[item.category];
            return (
              <View key={item.id}>
                {i > 0 && <Divider style={styles.inset} />}
                <View style={styles.item}>
                  <View style={[styles.itemIcon, { backgroundColor: (meta?.color || colors.primary) + '18' }]}>
                    <Ionicons name={meta?.icon || 'cube'} size={18} color={meta?.color || colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="subheading">{item.category}</Text>
                    <Text variant="caption" tone="subtle">Estimasi {formatNumber(item.estimated_weight, 1)} kg</Text>
                  </View>
                  {weighing ? (
                    <Stepper
                      value={weights[item.id] ?? ''}
                      onChange={(v) => setWeights((w) => ({ ...w, [item.id]: v }))}
                    />
                  ) : item.actual_weight != null ? (
                    <Text variant="subheading">{formatNumber(item.actual_weight, 2)} kg</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      </Screen>

      <Dialog
        visible={releaseOpen}
        tone="warning"
        icon="return-up-back"
        title="Lepas tugas ini?"
        message="Order dikembalikan ke daftar tersedia dan pengguna diberi tahu bahwa kurir lain akan dicarikan."
        cancelLabel="Batal"
        confirmLabel="Lepas tugas"
        destructive
        loading={busy}
        onCancel={() => setReleaseOpen(false)}
        onConfirm={release}
      />
    </>
  );
}

function Stepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const num = parseKg(value) || 0;
  const step = (delta: number) => {
    const next = Math.min(MAX_KG, Math.max(0, Math.round((num + delta) * 10) / 10));
    onChange(String(next));
  };
  const invalid = !(num > 0 && num <= MAX_KG);
  return (
    <View style={styles.stepper}>
      <IconButton icon="remove" size={34} accessibilityLabel="Kurangi berat" onPress={() => step(-STEP)} />
      <View style={[styles.stepInput, invalid && styles.stepInvalid]}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          style={styles.stepText}
          accessibilityLabel="Berat dalam kilogram"
          maxLength={6}
          selectTextOnFocus
        />
        <Text variant="caption" tone="subtle">kg</Text>
      </View>
      <IconButton icon="add" size={34} accessibilityLabel="Tambah berat" onPress={() => step(STEP)} />
    </View>
  );
}

function useSecondsLeft(expiresAt: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

function QrPanel({ verif, busy, onNewCode, onReweigh }: {
  verif: VerificationCode | null;
  busy: boolean;
  onNewCode: () => void;
  onReweigh: () => void;
}) {
  const seconds = useSecondsLeft(verif?.expires_at);
  const expired = seconds === 0;

  return (
    <Card style={[styles.block, styles.qrCard]} elevated>
      <Text variant="heading" align="center">Minta pengguna memindai</Text>
      <Text variant="bodySmall" tone="muted" align="center" style={styles.qrLead}>
        Pengguna membuka “Pindai QR” di aplikasinya lalu menyetujui hasil timbangan.
      </Text>
      <View style={[styles.qrBox, expired && styles.qrExpired]}>
        {verif ? (
          <QRCode value={verif.qr_payload} size={208} color={colors.text} backgroundColor="#FFFFFF" />
        ) : (
          <Skeleton width={208} height={208} />
        )}
      </View>
      {verif && (
        <>
          <Text variant="caption" tone="subtle" align="center" style={styles.codeLabel}>KODE MANUAL</Text>
          <Text style={styles.code} align="center" selectable>{verif.code}</Text>
          <Text variant="bodySmall" weight="600" align="center" tone={expired ? 'danger' : 'muted'}>
            {expired
              ? 'Kode kedaluwarsa'
              : `Berlaku ${Math.floor((seconds ?? 0) / 60)}:${String((seconds ?? 0) % 60).padStart(2, '0')}`}
          </Text>
        </>
      )}
      <View style={styles.qrActions}>
        <Button title="Timbang ulang" variant="outline" size="sm" icon="scale-outline" onPress={onReweigh}
          disabled={busy} style={styles.flex} />
        <Button title="Buat kode baru" variant={expired ? 'primary' : 'secondary'} size="sm" icon="refresh"
          loading={busy} onPress={onNewCode} style={styles.flex} />
      </View>
    </Card>
  );
}

function SharingBadge({ state }: { state: SharingState }) {
  const map: Record<SharingState, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: keyof typeof Ionicons.glyphMap }> = {
    off: { label: 'Lokasi tidak dibagikan', tone: 'neutral', icon: 'navigate-outline' },
    starting: { label: 'Menyiapkan lokasi…', tone: 'neutral', icon: 'navigate-outline' },
    on: { label: 'Lokasi dibagikan', tone: 'success', icon: 'navigate' },
    denied: { label: 'Izin lokasi ditolak', tone: 'danger', icon: 'warning' },
    error: { label: 'Gagal kirim lokasi', tone: 'warning', icon: 'warning' },
  };
  const m = map[state];
  return <Pill label={m.label} tone={m.tone} icon={m.icon} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  block: { marginTop: spacing.md },
  done: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  mapWrap: { marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { height: 200 },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addr: { flexDirection: 'row', gap: spacing.md },
  nav: { marginTop: spacing.md, alignSelf: 'flex-start' },
  blockHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs,
  },
  weighHint: { paddingHorizontal: spacing.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  itemIcon: { width: 36, height: 36, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  inset: { marginLeft: spacing.lg + 36 + spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepInput: {
    flexDirection: 'row', alignItems: 'center', gap: 2, width: 76, height: 38, paddingHorizontal: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface,
  },
  stepInvalid: { borderColor: colors.danger },
  stepText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'right', padding: 0 },
  qrCard: { alignItems: 'center' },
  qrLead: { marginTop: spacing.xs, maxWidth: 280 },
  qrBox: {
    marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: colors.border,
  },
  qrExpired: { opacity: 0.25 },
  codeLabel: { marginTop: spacing.lg, letterSpacing: 1 },
  code: { fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: 6, color: colors.text, marginVertical: spacing.xs },
  qrActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' },
});
