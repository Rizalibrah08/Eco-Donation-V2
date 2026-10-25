import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { Card, Dialog, Divider, ListRow, Screen, Text, colors, fonts, spacing, Icon } from '../../ui';
import { InitialsAvatar } from '../../components/TaskCard';
import { formatDate, formatNumber } from '../../lib/format';
import type { Courier } from '../../lib/types';

export default function ProfileScreen() {
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
      <Screen refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
        <Text variant="title" style={styles.h1}>Profil</Text>

        <Card style={styles.identity}>
          <View style={styles.idRow}>
            <InitialsAvatar name={user?.name} size={56} bg={colors.primarySoft} fg={colors.primary} />
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={1}>{user?.name}</Text>
              <Text variant="bodySmall" tone="muted">Kurir Eco-Donation</Text>
            </View>
          </View>
          <Divider style={styles.rule} />
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue} tabular>{formatNumber(user?.completed_count)}</Text>
              <Text variant="caption" tone="muted">Penjemputan selesai</Text>
            </View>
            <View style={styles.vrule} />
            <View style={[styles.stat, styles.statRight]}>
              <Text style={styles.statValue} tabular>{formatNumber(user?.total_kg, 1)} kg</Text>
              <Text variant="caption" tone="muted">Sampah diangkut</Text>
            </View>
          </View>
        </Card>

        <Text variant="heading" style={styles.sectionTitle}>Informasi akun</Text>
        <Card padded={false}>
          <InfoRow icon="mail-outline" label="Email" value={user?.email || '-'} />
          <Divider style={styles.inset} />
          <InfoRow icon="call-outline" label="Nomor HP" value={user?.phone || '-'} />
          {user?.created_at && (
            <>
              <Divider style={styles.inset} />
              <InfoRow icon="calendar-outline" label="Bergabung" value={formatDate(user.created_at)} />
            </>
          )}
        </Card>

        <Card padded={false} style={styles.logout}>
          <ListRow icon="log-out-outline" title="Keluar" danger chevron={false} onPress={() => setConfirmLogout(true)} />
        </Card>
        <Text variant="caption" tone="muted" align="center" style={styles.version}>Eco-Donation Kurir v1.0.0</Text>
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

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={18} color={colors.textMuted} />
      <Text variant="bodySmall" tone="muted">{label}</Text>
      <Text variant="bodySmall" weight="600" numberOfLines={1} align="right" style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  h1: { marginBottom: spacing.xxl },
  identity: { padding: spacing.xl },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  rule: { marginVertical: spacing.lg },
  stats: { flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1, gap: spacing.xxs },
  statRight: { paddingLeft: spacing.lg },
  statValue: { fontSize: 20, lineHeight: 26, fontFamily: fonts.semibold, color: colors.text },
  vrule: { width: 1, backgroundColor: colors.rule },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 },
  infoValue: { flex: 1 },
  inset: { marginLeft: spacing.lg },
  logout: { marginTop: spacing.lg },
  version: { marginTop: spacing.xl },
});
