import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { useNotificationStore } from '../store/notifications';
import { connectSocket, disconnectSocket, subscribe } from '../services/socket';
import { refreshMe } from '../services/user';
import { ToastHost, toast, colors } from '../ui';

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const segments = useSegments();
  const router = useRouter();

  // Koneksi realtime selama sesi aktif.
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }
    connectSocket(token);
    refreshMe();
    useNotificationStore.getState().refresh();
  }, [token]);

  // Notifikasi realtime → toast + badge lonceng + saldo terbaru.
  useEffect(
    () =>
      subscribe('*', ({ event, payload }) => {
        if (!payload?.notification) return;
        useNotificationStore.getState().increment();
        const { title, message } = payload.notification;
        const orderId = payload.orderId;
        toast.info(title, message, orderId ? () => router.push(`/pickup/${orderId}`) : undefined);
        if (event === 'order:completed' || event === 'badge:unlocked') refreshMe();
      }),
    [router],
  );

  // Arahkan sesuai status login.
  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) router.replace('/(auth)/login');
    else if (token && inAuth) router.replace('/(tabs)');
  }, [token, hydrated, segments, router]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <ToastHost />
    </>
  );
}
