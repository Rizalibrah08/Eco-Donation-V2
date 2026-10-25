import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { Avatar, Card, Dialog, Divider, ListRow, Screen, Text, colors, spacing } from '../../ui';
import { formatDate, formatNumber } from '../../lib/format';
import type { Courier } from '../../lib/types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Courier>('/courier/me');
      setUser(data);
    } catch {
      // tetap tampilkan data tersimpan
    }
  }, [setUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <>
      <Screen padded={false} edgeToEdge statusBar="light" refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
        <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.avatarRing}>
            <Avatar name={user?.name} size={72} color="#FFFFFF" />
          </View>
          <Text variant="title" tone="inverse" style={styles.name}>{user?.name}</Text>
          <Text variant="bodySmall" style={styles.sub}>Kurir Eco-Donation</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.stats}>
            <Card style={styles.stat}>
              <Text variant="title" tone="primary">{formatNumber(user?.completed_count)}</Text>
              <Text variant="caption" tone="muted">Penjemputan selesai</Text>
            </Card>
            <Card style={styles.stat}>
              <Text variant="title" tone="primary">{formatNumber(user?.total_kg, 1)} kg</Text>
              <Text variant="caption" tone="muted">Sampah diangkut</Text>
            </Card>
          </View>

          <Card padded={false} style={styles.block}>
            <ListRow icon="mail-outline" title="Email" subtitle={user?.email} />
            <Divider />
            <ListRow icon="call-outline" title="Nomor HP" subtitle={user?.phone || '-'} />
            {user?.created_at && (
              <>
                <Divider />
                <ListRow icon="calendar-outline" title="Bergabung" subtitle={formatDate(user.created_at)} />
              </>
            )}
          </Card>

          <Card padded={false} style={styles.block}>
            <ListRow icon="log-out-outline" title="Keluar" danger onPress={() => setConfirmLogout(true)} />
          </Card>
          <Text variant="caption" tone="subtle" align="center" style={styles.version}>Eco-Donation Kurir v1.0.0</Text>
        </View>
      </Screen>

      <Dialog
        visible={confirmLogout}
        tone="danger"
        icon="log-out"
        title="Keluar dari akun?"
        message="Anda tidak akan menerima tugas baru sampai masuk kembali."
        cancelLabel="Batal"
        confirmLabel="Keluar"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); logout(); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingBottom: spacing.xxxl + spacing.lg },
  avatarRing: { padding: 4, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.18)' },
  name: { marginTop: spacing.md },
  sub: { color: 'rgba(255,255,255,0.8)', marginTop: spacing.xxs },
  content: { paddingHorizontal: spacing.lg, marginTop: -spacing.xxl },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  block: { marginTop: spacing.lg },
  version: { marginTop: spacing.xl },
});
