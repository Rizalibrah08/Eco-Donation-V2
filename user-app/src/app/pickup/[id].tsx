import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { useSocketEvent } from '../../services/socket';
import { useRates } from '../../hooks/useRates';
import { LeafletMap, MapMarker } from '../../components/LeafletMap';
import { StatusTimeline } from '../../components/StatusTimeline';
import {
  AppBar, Avatar, Button, Card, CategoryTile, Dialog, Divider, EmptyState, Pill, Screen, Skeleton, Text,
  colors, radius, spacing, toast, Icon } from '../../ui';
import { STATUS } from '../../lib/status';
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
        <Skeleton height={120} radius={radius.card} />
        <Skeleton height={220} radius={radius.card} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  const s = STATUS[order.status];
  const canCancel = order.status === 'waiting' || order.status === 'on_the_way';
  const showMap = order.status === 'on_the_way' || order.status === 'arrived' || order.status === 'waiting';
  const earned = order.items.reduce((sum, i) => sum + Math.round((i.actual_weight ?? 0) * (rates[i.category] || 0)), 0);
  const weighed = order.items.length > 0 && order.items.every((i) => i.actual_weight != null);
  const totalKg = order.items.reduce((sum, i) => sum + (weighed ? i.actual_weight ?? 0 : i.estimated_weight), 0);

  return (
    <>
      <Screen
        header={<AppBar title={`Penjemputan #${order.id}`} subtitle={formatSchedule(order.scheduled_at)} />}
        footer={
          order.status === 'pending_verification' ? (
            <Button title="Pindai QR kurir" icon="qr-code-outline" size="lg"
              onPress={() => router.push({ pathname: '/scan', params: { order: String(order.id) } })} />
          ) : canCancel ? (
            <Button title="Batalkan penjemputan" variant="dangerOutline" onPress={() => setCancelOpen(true)} />
          ) : undefined
        }
      >
        <Card style={[styles.card, styles.cardPad]}>
          <Pill label={s.label} tone={s.tone} dot />
          {order.status === 'on_the_way' && eta ? (
            <View style={styles.eta}>
              <View style={styles.etaRow}>
                <Text variant="display" tabular>± {eta.minutes}</Text>
                <Text tone="muted">menit lagi</Text>
              </View>
              <Text variant="bodySmall" tone="muted" tabular>
                Kurir berjarak {formatNumber(eta.distance / 1000, 1)} km dari lokasi Anda
              </Text>
            </View>
          ) : (
            <Text variant="bodySmall" tone="muted" style={styles.hint}>{s.hint}</Text>
          )}

          {order.status === 'completed' && earned > 0 && (
            <View style={styles.earned}>
              <Icon name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text variant="subheading" tone="success" tabular>+{formatNumber(earned)} poin diterima</Text>
            </View>
          )}

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
            <>
              <Divider style={styles.rule} />
              <View style={styles.courier}>
                <Avatar name={order.courier_name} />
                <View style={styles.flex}>
                  <Text variant="caption" tone="muted">Kurir Anda</Text>
                  <Text variant="subheading" numberOfLines={1}>{order.courier_name}</Text>
                </View>
                {order.courier_phone && order.status !== 'completed' && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Telepon kurir" hitSlop={6}
                    onPress={() => Linking.openURL(`tel:${order.courier_phone}`)}
                    style={({ pressed }) => [styles.call, pressed && { backgroundColor: colors.primarySoftPressed }]}>
                    <Icon name="call-outline" size={20} color={colors.primary} />
                  </Pressable>
                )}
              </View>
            </>
          )}
        </Card>

        {order.status !== 'cancelled' && (
          <Card style={[styles.card, styles.cardPad]}>
            <Text variant="heading" style={styles.cardTitle}>Status penjemputan</Text>
            <StatusTimeline order={order} />
          </Card>
        )}

        <Card style={[styles.card, styles.listCard]} padded={false}>
          <View style={[styles.cardHead, styles.pad]}>
            <Text variant="heading">Rincian sampah</Text>
            <Text variant="bodySmall" tone="muted" tabular>
              {weighed ? '' : '± '}{formatNumber(totalKg, 2)} kg
            </Text>
          </View>
          {order.items.map((item, i) => (
            <View key={item.id}>
              {i > 0 && <Divider style={styles.inset} />}
              <View style={styles.item}>
                <CategoryTile name={item.category} size={36} />
                <View style={styles.flex}>
                  <Text variant="body" numberOfLines={1}>{item.category}</Text>
                  <Text variant="caption" tone="muted" tabular>Estimasi {formatNumber(item.estimated_weight, 1)} kg</Text>
                </View>
                {item.actual_weight != null ? (
                  <View style={styles.right}>
                    <Text variant="body" weight="600" tabular>{formatNumber(item.actual_weight, 2)} kg</Text>
                    <Text variant="caption" tone="success" tabular>
                      +{formatNumber(Math.round(item.actual_weight * (rates[item.category] || 0)))} poin
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption" tone="muted">Belum ditimbang</Text>
                )}
              </View>
            </View>
          ))}
        </Card>

        <Card style={[styles.card, styles.cardPad]}>
          <View style={styles.addr}>
            <Icon name="location-outline" size={20} color={colors.textMuted} />
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">Alamat penjemputan</Text>
              <Text variant="bodySmall" style={styles.addrText}>{order.pickup_address}</Text>
            </View>
          </View>
          <Divider style={styles.rule} />
          <Text variant="caption" tone="muted">Dibuat {formatDateTime(order.created_at)}</Text>
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
  card: { marginBottom: spacing.lg },
  cardPad: { padding: spacing.xl },
  listCard: { paddingBottom: spacing.sm },
  cardTitle: { marginBottom: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  pad: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  hint: { marginTop: spacing.md },
  eta: { marginTop: spacing.md, gap: spacing.xs },
  etaRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  earned: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg,
    paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md, borderRadius: 14, backgroundColor: colors.successSoft,
  },
  mapWrap: { marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { height: 200 },
  mapNote: {
    position: 'absolute', bottom: spacing.sm, alignSelf: 'center', backgroundColor: colors.surface,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
  },
  rule: { marginVertical: spacing.lg },
  courier: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  call: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  inset: { marginLeft: spacing.xl + 36 + spacing.md },
  right: { alignItems: 'flex-end' },
  addr: { flexDirection: 'row', gap: spacing.md },
  addrText: { marginTop: 2 },
});
