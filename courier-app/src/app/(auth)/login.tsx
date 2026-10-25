import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import api, { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { AuthHero } from '../../components/AuthHero';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Screen, Text, colors, radius, spacing, Icon } from '../../ui';

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
    <Screen contentStyle={styles.content}>
      <AuthHero title="Siap menjemput?" subtitle="Ambil tugas, timbang sampah, dan bantu warga berdonasi." />

      <View style={styles.form}>
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

        <View style={styles.note}>
          <Icon name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text variant="caption" tone="muted" style={styles.flex}>Akun kurir dibuat oleh admin Eco-Donation.</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.demo}>
        <Icon name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text variant="caption" tone="muted" style={styles.flex}>Akun demo: andi@kurir.com • sandi 123456</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  flex: { flex: 1 },
  form: { marginTop: spacing.xxxl },
  alert: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.lg },
  cta: { marginTop: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  spacer: { flex: 1, minHeight: spacing.xxl },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
