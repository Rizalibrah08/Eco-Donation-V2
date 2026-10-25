import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import api, { getErrorCode, getErrorMessage } from '../../services/api';
import { useSocketEvent } from '../../services/socket';
import { useLocationSharing, SharingState } from '../../hooks/useLocationSharing';
import { LeafletMap, MapMarker } from '../../components/LeafletMap';
import { InitialsAvatar } from '../../components/TaskCard';
import {
  AppBar, Button, Card, CategoryTile, Dialog, Divider, EmptyState, IconButton, Pill, Screen, Skeleton, Text,
  colors, fonts, radius, spacing, toast, Icon } from '../../ui';
import { STATUS, mapsUrl, totalKg } from '../../lib/status';
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
  const rates = useRates();

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
  const userName = order.user_name || 'Pengguna';
  const hasActual = order.items.every((i) => i.actual_weight != null);
  const weighedKg = order.items.reduce((sum, i) => sum + (parseKg(weights[i.id] ?? '') || 0), 0);
  const weighedPoints = rates
    ? order.items.reduce((sum, i) => sum + (pointsFor(rates, i.category, parseKg(weights[i.id] ?? '') || 0) ?? 0), 0)
    : null;

  let footer: React.ReactNode;
  if (order.status === 'waiting') {
    footer = <Button title="Ambil tugas ini" icon="hand-right-outline" size="lg" loading={busy} onPress={accept} />;
  } else if (order.status === 'on_the_way') {
    footer = <Button title="Saya sudah tiba" icon="location-outline" size="lg" loading={busy} onPress={arrive} />;
  } else if (weighing) {
    footer = (
      <Button title="Simpan & tampilkan QR" icon="qr-code-outline" size="lg" loading={busy} disabled={invalidWeight}
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
          <Pill label={s.label} tone={s.tone} />
          {order.status === 'on_the_way' && <SharingBadge state={sharing} />}
        </View>

        {showQr && (
          <QrPanel verif={verif} busy={busy} onNewCode={newCode}
            onReweigh={() => { setReweigh(true); setVerif(null); }} />
        )}

        {order.status === 'completed' && (
          <View style={[styles.block, styles.done]}>
            <Icon name="checkmark-circle-outline" size={24} color={colors.success} />
            <View style={styles.flex}>
              <Text variant="subheading">Penjemputan selesai</Text>
              <Text variant="bodySmall" tone="muted">
                Disetujui pengguna{order.completed_at ? ` • ${formatDateTime(order.completed_at)}` : ''}
              </Text>
            </View>
          </View>
        )}

        {showMap && (
          <Card padded={false} style={[styles.block, styles.mapCard]}>
            <LeafletMap center={{ lat: order.pickup_lat, lng: order.pickup_lng }} markers={markers} zoom={16}
              style={styles.map} interactive />
          </Card>
        )}

        {weighing ? (
          <>
            <View style={styles.section}>
              <Text variant="heading">Timbang sampah</Text>
              <Text variant="bodySmall" tone="muted" style={styles.sectionHint}>
                Masukkan berat aktual tiap kategori bersama pengguna.
              </Text>
            </View>
            <Card padded={false}>
              {order.items.map((item, i) => {
                const kg = parseKg(weights[item.id] ?? '') || 0;
                const rate = rates?.[item.category];
                const pts = pointsFor(rates, item.category, kg);
                return (
                  <View key={item.id}>
                    {i > 0 && <Divider />}
                    <View style={styles.weighRow}>
                      <View style={styles.itemHead}>
                        <CategoryTile name={item.category} size={36} />
                        <View style={styles.flex}>
                          <Text variant="body" weight="600">{item.category}</Text>
                          <Text variant="caption" tone="muted" tabular>
                            Estimasi {formatNumber(item.estimated_weight, 1)} kg
                            {rate != null ? ` · ${formatNumber(rate)} poin/kg` : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.stepRow}>
                        <Stepper
                          value={weights[item.id] ?? ''}
                          onChange={(v) => setWeights((w) => ({ ...w, [item.id]: v }))}
                        />
                        {pts != null && (
                          <View style={styles.ptsCol}>
                            <Text variant="heading" tone="success" tabular>+{formatNumber(pts)}</Text>
                            <Text variant="caption" tone="muted">poin</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>

            <View style={[styles.block, styles.summary]}>
              <View style={styles.summaryRow}>
                <Text variant="bodySmall" tone="muted">Total timbangan</Text>
                <Text variant="heading" tabular>{formatNumber(weighedKg, 2)} kg</Text>
              </View>
              {weighedPoints != null && (
                <View style={[styles.summaryRow, styles.summaryGap]}>
                  <Text variant="bodySmall" tone="muted" numberOfLines={1} style={styles.flex}>Poin untuk {userName}</Text>
                  <Text variant="heading" tone="success" tabular>+{formatNumber(weighedPoints)}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <Card style={styles.block} padded={false}>
            <View style={styles.blockHead}>
              <Text variant="heading">{hasActual ? 'Hasil timbangan' : 'Rincian sampah'}</Text>
              <Text variant="caption" tone="muted" tabular>
                {hasActual ? 'Total' : 'Estimasi'} {formatNumber(totalKg(order.items), 1)} kg
              </Text>
            </View>
            {order.items.map((item) => {
              const pts = item.actual_weight != null ? pointsFor(rates, item.category, item.actual_weight) : null;
              return (
                <View key={item.id}>
                  <Divider style={styles.inset} />
                  <View style={styles.item}>
                    <CategoryTile name={item.category} size={36} />
                    <View style={styles.flex}>
                      <Text variant="body" weight="600">{item.category}</Text>
                      <Text variant="caption" tone="muted" tabular>Estimasi {formatNumber(item.estimated_weight, 1)} kg</Text>
                    </View>
                    {item.actual_weight != null && (
                      <View style={styles.itemRight}>
                        <Text variant="body" weight="600" tabular>{formatNumber(item.actual_weight, 2)} kg</Text>
                        {pts != null && <Text variant="caption" tone="success" tabular>+{formatNumber(pts)} poin</Text>}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        <Card style={styles.block}>
          <View style={styles.person}>
            <InitialsAvatar name={userName} size={44} />
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">Pengguna</Text>
              <Text variant="body" weight="600" numberOfLines={1}>{userName}</Text>
            </View>
            {order.user_phone && order.status !== 'waiting' && order.status !== 'completed' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Telepon pengguna"
                hitSlop={6}
                onPress={() => Linking.openURL(`tel:${order.user_phone}`)}
                style={({ pressed }) => [styles.call, pressed && styles.callPressed]}
              >
                <Icon name="call-outline" size={20} color={colors.primary} />
              </Pressable>
            )}
          </View>
          <Divider style={styles.rule} />
          <View style={styles.addr}>
            <Icon name="location-outline" size={18} color={colors.textMuted} />
            <Text variant="bodySmall" style={styles.flex}>{order.pickup_address}</Text>
          </View>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button title="Buka di Google Maps" icon="navigate-outline" variant="secondary" size="sm" style={styles.nav}
              onPress={() => Linking.openURL(mapsUrl(order.pickup_lat, order.pickup_lng))} />
          )}
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

// Poin per kg dibaca dari backend (/config/rates); bila belum termuat, angka poin tidak ditampilkan.
function useRates() {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    let alive = true;
    api.get<{ rates: Record<string, number> }>('/config/rates')
      .then(({ data }) => { if (alive && data?.rates) setRates(data.rates); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return rates;
}

// Sama dengan perhitungan server: pembulatan per item.
function pointsFor(rates: Record<string, number> | null, category: string, kg: number) {
  const rate = rates?.[category];
  return rate == null ? null : Math.round(kg * rate);
}

function Stepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const num = parseKg(value) || 0;
  const step = (delta: number) => {
    const next = Math.min(MAX_KG, Math.max(0, Math.round((num + delta) * 10) / 10));
    onChange(String(next));
  };
  const invalid = !(num > 0 && num <= MAX_KG);
  return (
    <View style={[styles.stepper, invalid && styles.stepInvalid]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Kurangi berat" onPress={() => step(-STEP)}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}>
        <Icon name="remove" size={20} color={colors.text} />
      </Pressable>
      <View style={styles.stepValue}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          style={styles.stepText}
          accessibilityLabel="Berat dalam kilogram"
          maxLength={6}
          selectTextOnFocus
        />
        <Text variant="bodySmall" tone="muted">kg</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Tambah berat" onPress={() => step(STEP)}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}>
        <Icon name="add" size={20} color={colors.text} />
      </Pressable>
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
    <Card style={[styles.block, styles.qrCard]}>
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
          <Text variant="caption" tone="muted" align="center" style={styles.codeLabel}>Kode manual</Text>
          <Text style={styles.code} align="center" selectable tabular>{verif.code}</Text>
          {expired ? (
            <Text variant="bodySmall" weight="600" tone="danger" align="center">Kode kedaluwarsa</Text>
          ) : (
            <Pill
              tone="warning"
              icon="time-outline"
              label={`Berlaku ${Math.floor((seconds ?? 0) / 60)}:${String((seconds ?? 0) % 60).padStart(2, '0')}`}
              style={styles.timer}
            />
          )}
        </>
      )}
      <View style={styles.qrActions}>
        <Button title="Timbang ulang" variant="secondary" size="sm" icon="scale-outline" onPress={onReweigh}
          disabled={busy} style={styles.flex} />
        <Button title="Buat kode baru" variant={expired ? 'primary' : 'secondary'} size="sm" icon="refresh-outline"
          loading={busy} onPress={onNewCode} style={styles.flex} />
      </View>
    </Card>
  );
}

function SharingBadge({ state }: { state: SharingState }) {
  const map: Record<SharingState, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: keyof typeof Ionicons.glyphMap }> = {
    off: { label: 'Lokasi tidak dibagikan', tone: 'neutral', icon: 'navigate-outline' },
    starting: { label: 'Menyiapkan lokasi…', tone: 'neutral', icon: 'navigate-outline' },
    on: { label: 'Lokasi dibagikan', tone: 'success', icon: 'navigate-outline' },
    denied: { label: 'Izin lokasi ditolak', tone: 'danger', icon: 'warning-outline' },
    error: { label: 'Gagal kirim lokasi', tone: 'warning', icon: 'warning-outline' },
  };
  const m = map[state];
  return <Pill label={m.label} tone={m.tone} icon={m.icon} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  block: { marginTop: spacing.lg },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md },
  sectionHint: { marginTop: spacing.xxs },
  done: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
    borderRadius: radius.card, backgroundColor: colors.successSoft,
  },
  mapCard: { borderRadius: radius.lg, overflow: 'hidden' },
  map: { height: 200 },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  call: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  callPressed: { backgroundColor: colors.primarySoftPressed },
  rule: { marginVertical: spacing.lg },
  addr: { flexDirection: 'row', gap: spacing.sm },
  nav: { marginTop: spacing.lg, height: 44 },
  blockHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  itemRight: { alignItems: 'flex-end' },
  inset: { marginHorizontal: spacing.lg },
  weighRow: { padding: spacing.lg, gap: spacing.md },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  ptsCol: { alignItems: 'flex-end' },
  stepper: {
    flexDirection: 'row', alignItems: 'stretch', height: 48, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface,
  },
  stepInvalid: { borderColor: colors.danger },
  stepBtn: { width: 48, alignItems: 'center', justifyContent: 'center' },
  stepBtnPressed: { backgroundColor: colors.surfaceAlt },
  stepValue: {
    width: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm, backgroundColor: colors.surfaceAlt,
  },
  stepText: {
    minWidth: 36, maxWidth: 60, fontSize: 20, fontFamily: fonts.semibold, color: colors.text,
    textAlign: 'right', padding: 0, fontVariant: ['tabular-nums'],
  },
  summary: { padding: spacing.lg, borderRadius: radius.card, backgroundColor: colors.primarySoft },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryGap: { marginTop: spacing.sm },
  qrCard: { alignItems: 'center', padding: spacing.xl },
  qrLead: { marginTop: spacing.xs, maxWidth: 280 },
  qrBox: {
    marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: colors.border,
  },
  qrExpired: { opacity: 0.25 },
  codeLabel: { marginTop: spacing.lg },
  code: { fontSize: 32, lineHeight: 40, fontFamily: fonts.extrabold, letterSpacing: 8, color: colors.text, marginVertical: spacing.xs },
  timer: { alignSelf: 'center' },
  qrActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, alignSelf: 'stretch' },
});
