import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../services/api';
import { useSocketEvent } from '../services/socket';
import { useNotificationStore } from '../store/notifications';
import { AppBar, Card, EmptyState, Screen, SkeletonCard, Text, colors, radius, spacing, toast } from '../ui';
import { timeAgo } from '../lib/format';
import type { AppNotification } from '../lib/types';

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  'order:accepted': { icon: 'bicycle', color: colors.warning },
  'order:arrived': { icon: 'location', color: colors.primary },
  'order:near': { icon: 'navigate', color: colors.primary },
  'order:weighed': { icon: 'qr-code', color: colors.info },
  'order:completed': { icon: 'checkmark-circle', color: colors.success },
  'order:cancelled': { icon: 'close-circle', color: colors.danger },
  'badge:unlocked': { icon: 'ribbon', color: colors.gold },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const setUnread = useNotificationStore((s) => s.setUnread);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ items: AppNotification[]; unread_count: number }>('/notifications', {
        params: { limit: 50 },
      });
      setItems(data.items);
      setUnread(data.unread_count);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [setUnread]);

  useEffect(() => { load(); }, [load]);

  // Notifikasi baru masuk saat layar terbuka.
  useSocketEvent('*', ({ payload }) => {
    if (payload?.notification) load();
  });

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read', {});
      setItems((list) => list?.map((n) => ({ ...n, is_read: true })) ?? list);
      setUnread(0);
    } catch (err) {
      toast.error('Gagal menandai', getErrorMessage(err));
    }
  };

  const open = (n: AppNotification) => {
    if (!n.is_read) {
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? list);
      setUnread(Math.max(0, useNotificationStore.getState().unread - 1));
      api.post('/notifications/read', { ids: [n.id] }).catch(() => {});
    }
    if (n.order_id) router.push(`/pickup/${n.order_id}`);
    else if (n.type === 'badge:unlocked') router.push('/(tabs)/profil');
  };

  const hasUnread = !!items?.some((n) => !n.is_read);

  return (
    <Screen
      header={
        <AppBar
          title="Notifikasi"
          right={hasUnread ? (
            <Text variant="bodySmall" tone="primary" weight="700" onPress={markAllRead} accessibilityRole="button"
              suppressHighlighting>
              Baca semua
            </Text>
          ) : undefined}
        />
      }
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {error && !items ? (
        <EmptyState icon="alert-circle-outline" title="Tidak dapat memuat" message={error} actionLabel="Coba lagi"
          onAction={load} />
      ) : !items ? (
        <>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </>
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="Belum ada notifikasi"
          message="Kabar tentang penjemputan, poin, dan lencana Anda akan muncul di sini." />
      ) : (
        <Card padded={false} style={styles.list}>
          {items.map((n, i) => {
            const meta = TYPE_META[n.type] || { icon: 'notifications' as const, color: colors.primary };
            return (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                onPress={() => open(n)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowBorder,
                  !n.is_read && styles.unread,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.icon, { backgroundColor: meta.color + '1A' }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text variant="subheading" style={styles.flex} numberOfLines={1}>{n.title}</Text>
                    {!n.is_read && <View style={styles.dot} />}
                  </View>
                  <Text variant="bodySmall" tone="muted">{n.message}</Text>
                  <Text variant="caption" tone="subtle" style={styles.time}>{timeAgo(n.created_at)}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { overflow: 'hidden' },
  row: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  unread: { backgroundColor: colors.primarySoft + '80' },
  pressed: { backgroundColor: colors.surfaceAlt },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  time: { marginTop: spacing.xxs },
});
