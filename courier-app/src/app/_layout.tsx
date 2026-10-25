import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useAuthStore } from '../store/auth';
import { connectSocket, disconnectSocket, subscribe } from '../services/socket';
import { ToastHost, toast, colors } from '../ui';

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Koneksi realtime selama sesi aktif (room courier:{id} + couriers).
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }
    connectSocket(token);
  }, [token]);

  // Notifikasi tersimpan (ditolak, dibatalkan, selesai) → toast yang membuka tugas terkait.
  useEffect(
    () =>
      subscribe('*', ({ event, payload }) => {
        if (payload?.notification) {
          const { title, message } = payload.notification;
          const orderId = payload.orderId;
          const show = event === 'order:completed' ? toast.success : toast.info;
          show(title, message, orderId ? () => router.push(`/task/${orderId}`) : undefined);
        } else if (event === 'order:new' && payload?.order?.status === 'waiting') {
          toast.info('Order baru tersedia', payload.order.pickup_address, () => router.push(`/task/${payload.orderId}`));
        }
      }),
    [router],
  );

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) router.replace('/(auth)/login');
    else if (token && inAuth) router.replace('/(tabs)');
  }, [token, hydrated, segments, router]);

  // Gagal memuat font tidak memblokir aplikasi; teks jatuh ke font sistem.
  if (!hydrated || (!fontsLoaded && !fontError)) {
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
      </Stack>
      <ToastHost />
    </>
  );
}
