import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';
import { AppBar, Avatar, Button, Card, Input, Screen, Text, spacing, toast } from '../ui';
import type { User } from '../lib/types';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileChanged = name.trim() !== (user?.name ?? '') || phone.trim() !== (user?.phone ?? '');

  const saveProfile = async () => {
    if (name.trim().length < 2) {
      setProfileError('Nama minimal 2 karakter.');
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      const { data } = await api.patch<User>('/users/me', { name: name.trim(), phone: phone.trim() });
      setUser(data);
      toast.success('Profil diperbarui');
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (next.length < 6) return setPasswordError('Kata sandi baru minimal 6 karakter.');
    if (next !== confirm) return setPasswordError('Konfirmasi kata sandi tidak cocok.');
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await api.post('/users/me/password', { current_password: current, new_password: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Kata sandi diubah');
      router.back();
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Screen header={<AppBar title="Edit profil" />}>
      <View style={styles.head}>
        <Avatar name={name || user?.name} size={72} />
        <Text variant="heading" style={styles.headName}>{name || user?.name}</Text>
        <Text variant="bodySmall" tone="muted">{user?.email}</Text>
      </View>

      <Text variant="overline" tone="subtle" style={styles.section}>Data diri</Text>
      <Card style={styles.card}>
        <Input label="Nama lengkap" icon="person-outline" value={name} onChangeText={setName} maxLength={80}
          autoCapitalize="words" />
        <Input label="Nomor HP" icon="call-outline" value={phone} onChangeText={setPhone} maxLength={20}
          keyboardType="phone-pad" placeholder="08xxxxxxxxxx" hint="Dipakai kurir untuk menghubungi Anda." />
        <Input label="Email" icon="mail-outline" value={user?.email ?? ''} editable={false}
          hint="Email tidak dapat diubah." error={profileError} />
        <Button title="Simpan perubahan" onPress={saveProfile} loading={savingProfile} disabled={!profileChanged} />
      </Card>

      <Text variant="overline" tone="subtle" style={styles.section}>Ubah kata sandi</Text>
      <Card style={styles.card}>
        <Input label="Kata sandi saat ini" icon="lock-closed-outline" value={current} onChangeText={setCurrent}
          secureTextEntry autoCapitalize="none" />
        <Input label="Kata sandi baru" icon="key-outline" value={next} onChangeText={setNext} secureTextEntry
          autoCapitalize="none" hint="Minimal 6 karakter." />
        <Input label="Ulangi kata sandi baru" icon="key-outline" value={confirm} onChangeText={setConfirm}
          secureTextEntry autoCapitalize="none" error={passwordError} />
        <Button title="Ubah kata sandi" variant="secondary" onPress={savePassword} loading={savingPassword}
          disabled={!current || !next || !confirm} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', paddingVertical: spacing.md },
  headName: { marginTop: spacing.md },
  section: { marginTop: spacing.xxl, marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { gap: spacing.lg },
});
