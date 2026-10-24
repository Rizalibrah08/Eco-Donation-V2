import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../services/api';
import { useSocketEvent } from '../../services/socket';
import { useRates } from '../../hooks/useRates';
import { LeafletMap, MapMarker } from '../../components/LeafletMap';
import { StatusTimeline } from '../../components/StatusTimeline';
import {
  AppBar, Avatar, Button, Card, Dialog, Divider, EmptyState, IconButton, Pill, Screen, Skeleton, Text,
  colors, radius, spacing, toast,
} from '../../ui';
import { STATUS, CATEGORY_META } from '../../lib/status';
import { formatDateTime, formatNumber, formatSchedule } from '../../lib/format';
import type { LocationUpdate, PickupOrder } from '../../lib/types';

export default function PickupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const { rates } = useRates();
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<{ distance: number; minutes: number } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PickupOrder>(`/pickups/${orderId}`);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent(['order:accepted', 'order:arrived', 'order:weighed', 'order:completed', 'order:cancelled'], (p) => {
    if (p?.orderId === orderId) load();
  });
  useSocketEvent('order:location', (p: LocationUpdate) => {
    if (p.orderId !== orderId) return;
    setOrder((o) => (o ? { ...o, courier_lat: p.lat, courier_lng: p.lng, courier_location_at: p.at } : o));
    setEta({ distance: p.distance_m, minutes: p.eta_min });
  });

  const markers = useMemo<MapMarker[]>(() => {
    if (!order) return [];
    const list: MapMarker[] = [{ id: 'pickup', kind: 'pickup', lat: order.pickup_lat, lng: order.pickup_lng }];
    if (order.courier_lat != null && order.courier_lng != null && order.status === 'on_the_way') {
      list.push({ id: 'courier', kind: 'courier', lat: order.courier_lat, lng: order.courier_lng });
    }
    return list;
  }, [order]);

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/pickups/${orderId}/cancel`, {});
      setCancelOpen(false);
      toast.success('Penjemputan dibatalkan');
      load();
    } catch (err) {
      toast.error('Gagal membatalkan', getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (error && !order) {
    return (
      <Screen header={<AppBar title="Detail penjemputan" />}>
        <EmptyState icon="alert-circle-outline" title="Tidak dapat memuat" message={error} actionLabel="Coba lagi" onAction={load} />
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen header={<AppBar title="Detail penjemputan" />}>
        <Skeleton height={120} radius={radius.lg} />
        <Skeleton height={220} radius={radius.lg} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  const s = STATUS[order.status];
  const canCancel = order.status === 'waiting' || order.status === 'on_the_way';
  const showMap = order.status === 'on_the_way' || order.status === 'arrived' || order.status === 'waiting';
  const earned = order.items.reduce((sum, i) => sum + Math.round((i.actual_weight ?? 0) * (rates[i.category] || 0)), 0);

  return (
    <>
      <Screen
        header={<AppBar title={`Penjemputan #${order.id}`} subtitle={formatSchedule(order.scheduled_at)} />}
        footer={
          order.status === 'pending_verification' ? (
            <Button title="Pindai QR Kurir" icon="qr-code" size="lg"
              onPress={() => router.push({ pathname: '/scan', params: { order: String(order.id) } })} />
          ) : canCancel ? (
            <Button title="Batalkan penjemputan" variant="outline" onPress={() => setCancelOpen(true)} />
          ) : undefined
        }
      >
        <Card style={[styles.statusCard, { borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={s.icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Pill label={s.label} tone={s.tone} dot />
              <Text variant="bodySmall" tone="muted" style={styles.hint}>{s.hint}</Text>
            </View>
          </View>
          {order.status === 'on_the_way' && eta && (
            <View style={styles.eta}>
              <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
              <Text variant="subheading" style={{ color: colors.primaryDark }}>
                Tiba ± {eta.minutes} menit
              </Text>
              <Text variant="bodySmall" tone="muted">• {formatNumber(eta.distance / 1000, 1)} km lagi</Text>
            </View>
          )}
          {order.status === 'completed' && earned > 0 && (
            <View style={styles.eta}>
              <Ionicons name="leaf" size={18} color={colors.success} />
              <Text variant="subheading" tone="success">+{formatNumber(earned)} poin diterima</Text>
            </View>
          )}
        </Card>

        {showMap && (
          <View style={styles.mapWrap}>
            <LeafletMap center={{ lat: order.pickup_lat, lng: order.pickup_lng }} markers={markers} fitMarkers
              style={styles.map} interactive />
            {order.status === 'on_the_way' && order.courier_lat == null && (
              <View style={styles.mapNote}>
                <Text variant="caption" tone="muted">Menunggu lokasi kurir…</Text>
              </View>
            )}
          </View>
        )}

        {order.courier_name && (
          <Card style={styles.block}>
            <View style={styles.courier}>
              <Avatar name={order.courier_name} />
              <View style={styles.flex}>
                <Text variant="caption" tone="subtle">Kurir Anda</Text>
                <Text variant="subheading">{order.courier_name}</Text>
              </View>
              {order.courier_phone && order.status !== 'completed' && (
                <IconButton icon="call" accessibilityLabel="Telepon kurir" color={colors.primary}
                  onPress={() => Linking.openURL(`tel:${order.courier_phone}`)} />
              )}
            </View>
          </Card>
        )}

        {order.status !== 'cancelled' && (
          <Card style={styles.block}>
            <Text variant="subheading" style={styles.blockTitle}>Status penjemputan</Text>
            <StatusTimeline order={order} />
          </Card>
        )}

        <Card style={styles.block} padded={false}>
          <Text variant="subheading" style={[styles.blockTitle, styles.pad]}>Rincian sampah</Text>
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
                  {item.actual_weight != null ? (
                    <View style={styles.right}>
                      <Text variant="subheading">{formatNumber(item.actual_weight, 2)} kg</Text>
                      <Text variant="caption" tone="primary">+{formatNumber(Math.round(item.actual_weight * (rates[item.category] || 0)))}</Text>
                    </View>
                  ) : (
                    <Text variant="caption" tone="subtle">Belum ditimbang</Text>
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        <Card style={styles.block}>
          <View style={styles.addr}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={styles.flex}>
              <Text variant="caption" tone="subtle">Alamat penjemputan</Text>
              <Text variant="bodySmall">{order.pickup_address}</Text>
            </View>
          </View>
          <Divider style={{ marginVertical: spacing.md }} />
          <Text variant="caption" tone="subtle">Dibuat {formatDateTime(order.created_at)}</Text>
        </Card>
      </Screen>

      <Dialog
        visible={cancelOpen}
        tone="danger"
        icon="close-circle"
        title="Batalkan penjemputan?"
        message={order.courier_name ? 'Kurir sudah menuju lokasi Anda. Yakin ingin membatalkan?' : 'Permintaan ini akan dihapus dari daftar kurir.'}
        cancelLabel="Tidak"
        confirmLabel="Ya, batalkan"
        destructive
        loading={cancelling}
        onCancel={() => setCancelOpen(false)}
        onConfirm={cancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusCard: {},
  statusRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  statusIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: spacing.xs + 2 },
  eta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md,
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft,
  },
  mapWrap: { marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { height: 220 },
  mapNote: {
    position: 'absolute', bottom: spacing.sm, alignSelf: 'center', backgroundColor: colors.surface,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill,
  },
  block: { marginTop: spacing.md },
  blockTitle: { marginBottom: spacing.md },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.xs },
  courier: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  itemIcon: { width: 36, height: 36, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  inset: { marginLeft: spacing.lg + 36 + spacing.md },
  right: { alignItems: 'flex-end' },
  addr: { flexDirection: 'row', gap: spacing.md },
});
