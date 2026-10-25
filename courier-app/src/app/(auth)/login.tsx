import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
      const { data } = await api.post('/auth/courier/login', { email: email.trim(), password });
      setSession(data.courier, data.token);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false} edgeToEdge statusBar="light" background={colors.surface}>
      <AuthHero title="Siap menjemput?" subtitle="Ambil tugas, timbang sampah, dan bantu warga berdonasi." />
      <View style={styles.sheet}>
        <Text variant="title">Masuk kurir</Text>
        <Text tone="muted" style={styles.lead}>Akun kurir dibuat oleh admin Eco-Donation.</Text>

        {error && (
          <View style={styles.alert} accessibilityRole="alert">
            <Text variant="bodySmall" tone="danger" weight="600">{error}</Text>
          </View>
        )}

        <Input
          label="Email"
          icon="mail-outline"
          placeholder="nama@kurir.com"
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

        <View style={styles.demo}>
          <Text variant="caption" tone="subtle" align="center">Akun demo: andi@kurir.com • sandi 123456</Text>
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
  demo: { marginTop: spacing.xxl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
