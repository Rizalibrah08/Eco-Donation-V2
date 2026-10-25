import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../services/api';
import { useSocketEvent } from '../services/socket';
import { useNotificationStore } from '../store/notifications';
import { AppBar, Card, EmptyState, Screen, SkeletonCard, Text, colors, spacing, toast, Icon } from '../ui';
import { formatDate, timeAgo } from '../lib/format';
import type { AppNotification } from '../lib/types';

// Semua jenis memakai perlakuan netral yang sama; hanya bentuk ikonnya yang berbeda.
const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  'order:accepted': 'bicycle-outline',
  'order:arrived': 'location-outline',
  'order:near': 'navigate-outline',
  'order:weighed': 'qr-code-outline',
  'order:completed': 'checkmark-circle-outline',
  'order:cancelled': 'close-circle-outline',
  'badge:unlocked': 'ribbon-outline',
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
  const groups = items ? groupByDay(items) : [];

  return (
    <Screen
      header={
        <AppBar
          title="Notifikasi"
          right={hasUnread ? (
            <Text variant="bodySmall" tone="primary" weight="600" onPress={markAllRead} accessibilityRole="button"
              suppressHighlighting style={styles.action}>
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
        groups.map((g, gi) => (
          <View key={g.label} style={gi > 0 && styles.group}>
            <Text variant="bodySmall" tone="muted" style={styles.groupLabel}>{g.label}</Text>
            <Card padded={false} style={styles.list}>
              {g.items.map((n, i) => {
                const icon = TYPE_ICON[n.type] || 'notifications-outline';
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
                    <View style={[styles.icon, n.is_read ? styles.iconRead : styles.iconUnread]}>
                      <Icon name={icon} size={20} color={n.is_read ? colors.textMuted : colors.primary} />
                    </View>
                    <View style={styles.body}>
                      <View style={styles.titleRow}>
                        <View style={styles.titleWrap}>
                          <Text variant="bodySmall" weight="600" style={styles.shrink} numberOfLines={1}>{n.title}</Text>
                          {!n.is_read && <View style={styles.dot} />}
                        </View>
                        <Text variant="caption" tone="muted">{timeAgo(n.created_at)}</Text>
                      </View>
                      <Text variant="bodySmall" tone="muted">{n.message}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

function groupByDay(list: AppNotification[]) {
  const today = new Date().toDateString();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = y.toDateString();
  const out: { label: string; items: AppNotification[] }[] = [];
  for (const n of list) {
    const d = new Date(n.created_at).toDateString();
    const label = d === today ? 'Hari ini' : d === yesterday ? 'Kemarin' : formatDate(n.created_at);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(n);
    else out.push({ label, items: [n] });
  }
  return out;
}

const styles = StyleSheet.create({
  action: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  group: { marginTop: spacing.xxl },
  groupLabel: { marginBottom: spacing.sm },
  list: { overflow: 'hidden' },
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.rule },
  unread: { backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.surfaceAlt },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconRead: { backgroundColor: colors.surfaceAlt },
  iconUnread: { backgroundColor: colors.surface },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shrink: { flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
