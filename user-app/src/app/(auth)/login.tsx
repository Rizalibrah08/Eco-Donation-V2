import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { AuthHero } from '../../components/AuthHero';
import { Button, Input, Screen, Text, colors, radius, spacing, shadow } from '../../ui';

export default function LoginScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailError = touched && !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Masukkan email yang valid.' : null;
  const passwordError = touched && !password ? 'Kata sandi wajib diisi.' : null;

  const handleLogin = async () => {
    setTouched(true);
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      setSession(data.user, data.token);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false} edgeToEdge statusBar="light" background={colors.surface}>
      <AuthHero title="Selamat datang kembali" subtitle="Ubah sampah menjadi kebaikan untuk sesama." />
      <View style={styles.sheet}>
        <Text variant="title">Masuk</Text>
        <Text tone="muted" style={styles.lead}>Gunakan akun Eco-Donation Anda.</Text>

        {error && (
          <View style={styles.alert} accessibilityRole="alert">
            <Text variant="bodySmall" tone="danger" weight="600">{error}</Text>
          </View>
        )}

        <Input
          label="Email"
          icon="mail-outline"
          placeholder="nama@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          containerStyle={styles.field}
        />
        <Input
          label="Kata sandi"
          icon="lock-closed-outline"
          placeholder="Masukkan kata sandi"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          containerStyle={styles.field}
        />

        <Button title="Masuk" onPress={handleLogin} loading={loading} size="lg" style={styles.cta} />

        <View style={styles.footer}>
          <Text tone="muted">Belum punya akun? </Text>
          <Link href="/(auth)/register" replace>
            <Text tone="primary" weight="700">Daftar sekarang</Text>
          </Link>
        </View>

        <View style={styles.demo}>
          <Text variant="caption" tone="subtle" align="center">Akun demo: satrio@email.com • sandi 123456</Text>
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
  lead: { marginTop: spacing.xs, marginBottom: spacing.xl },
  alert: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.lg },
  cta: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  demo: { marginTop: spacing.xxl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
