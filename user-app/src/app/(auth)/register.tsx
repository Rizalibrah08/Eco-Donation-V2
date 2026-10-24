import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { AuthHero } from '../../components/AuthHero';
import { Button, Input, Screen, Text, colors, radius, spacing, shadow, toast } from '../../ui';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function RegisterScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    name: form.name.trim().length < 2 ? 'Nama minimal 2 karakter.' : null,
    email: !EMAIL_RE.test(form.email.trim()) ? 'Masukkan email yang valid.' : null,
    phone: form.phone && !/^[0-9+ -]{8,20}$/.test(form.phone) ? 'Nomor telepon tidak valid.' : null,
    password: form.password.length < 6 ? 'Kata sandi minimal 6 karakter.' : null,
    confirm: form.confirm !== form.password ? 'Konfirmasi kata sandi tidak sama.' : null,
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  const handleRegister = async () => {
    setTouched(true);
    setError(null);
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.phone ? { phone: form.phone.trim() } : {}),
      });
      setSession(data.user, data.token);
      toast.success('Akun berhasil dibuat', `Selamat bergabung, ${data.user.name.split(' ')[0]}!`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false} edgeToEdge statusBar="light" background={colors.surface}>
      <AuthHero title="Buat akun baru" subtitle="Mulai setor sampah dan kumpulkan poin donasi." />
      <View style={styles.sheet}>
        {error && (
          <View style={styles.alert} accessibilityRole="alert">
            <Text variant="bodySmall" tone="danger" weight="600">{error}</Text>
          </View>
        )}
        <Input label="Nama lengkap" icon="person-outline" placeholder="Nama Anda" value={form.name}
          onChangeText={set('name')} error={show('name')} autoComplete="name" containerStyle={styles.field} />
        <Input label="Email" icon="mail-outline" placeholder="nama@email.com" keyboardType="email-address"
          autoCapitalize="none" autoComplete="email" value={form.email} onChangeText={set('email')}
          error={show('email')} containerStyle={styles.field} />
        <Input label="Nomor telepon (opsional)" icon="call-outline" placeholder="08xxxxxxxxxx" keyboardType="phone-pad"
          value={form.phone} onChangeText={set('phone')} error={show('phone')}
          hint="Memudahkan kurir menghubungi Anda." containerStyle={styles.field} />
        <Input label="Kata sandi" icon="lock-closed-outline" placeholder="Minimal 6 karakter" secureTextEntry
          value={form.password} onChangeText={set('password')} error={show('password')} containerStyle={styles.field} />
        <Input label="Konfirmasi kata sandi" icon="lock-closed-outline" placeholder="Ulangi kata sandi" secureTextEntry
          value={form.confirm} onChangeText={set('confirm')} error={show('confirm')} containerStyle={styles.field}
          returnKeyType="go" onSubmitEditing={handleRegister} />

        <Button title="Daftar" onPress={handleRegister} loading={loading} size="lg" style={styles.cta} />

        <View style={styles.footer}>
          <Text tone="muted">Sudah punya akun? </Text>
          <Link href="/(auth)/login" replace>
            <Text tone="primary" weight="700">Masuk</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: -spacing.xxl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl + spacing.xs,
    ...shadow.sm,
  },
  alert: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  cta: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
});
