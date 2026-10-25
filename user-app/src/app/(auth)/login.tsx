import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { useRates } from '../../hooks/useRates';
import { formatNumber } from '../../lib/format';
import { AuthHero, authStyles } from '../../components/AuthHero';
import { Button, Input, Screen, Text, categoryStyle, colors, radius, spacing, Icon } from '../../ui';

export default function LoginScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const { rates } = useRates();
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
    <Screen contentStyle={styles.content}>
      <AuthHero title="Selamat datang kembali" subtitle="Ubah sampah menjadi kebaikan untuk sesama." />

      {/* Nilai setoran per kg: data milik produk ini, langsung di layar pertama. */}
      <View style={styles.rates}>
        <View style={styles.ratesHead}>
          <Text variant="bodySmall" weight="500" tone="muted">Nilai setoran per kg</Text>
          <Text variant="bodySmall" weight="500" tone="muted">1 poin = Rp1</Text>
        </View>
        <View style={styles.rateRow}>
          {Object.keys(rates).map((name) => {
            const c = categoryStyle(name);
            return (
              <View key={name} style={[styles.rate, { backgroundColor: c.bg }]}>
                <Icon name={c.icon} size={18} color={c.ink} />
                <Text variant="heading" tabular style={{ color: c.ink }}>{formatNumber(rates[name])}</Text>
                <Text variant="caption" style={{ color: c.ink }}>{c.short}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {error && (
        <View style={authStyles.alert} accessibilityRole="alert">
          <Text variant="bodySmall" tone="danger" weight="500">{error}</Text>
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
        <Text variant="bodySmall" tone="muted">Belum punya akun? </Text>
        <Link href="/(auth)/register" replace>
          <Text variant="bodySmall" tone="primary" weight="600">Daftar sekarang</Text>
        </Link>
      </View>

      <View style={styles.demo}>
        <Icon name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text variant="caption" tone="muted">Akun demo: satrio@email.com · sandi 123456</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl },
  rates: { marginTop: spacing.xxl, marginBottom: spacing.xxxl, gap: spacing.sm },
  ratesHead: { flexDirection: 'row', justifyContent: 'space-between' },
  rateRow: { flexDirection: 'row', gap: spacing.sm },
  rate: { flex: 1, borderRadius: 14, padding: spacing.sm + 2, gap: 6 },
  field: { marginBottom: spacing.lg },
  cta: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxxl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
});
