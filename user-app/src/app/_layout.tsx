import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { initSocketConnection, disconnectSocket, getSocket } from '../services/socketService';
import NotificationBanner from '../components/NotificationBanner';
import SuccessModal from '../components/SuccessModal';

export default function RootLayout() {
  const { user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      initSocketConnection(user.id, (notification) => {
        setActiveNotification(notification);
      });

      const socket = getSocket();
      if (socket) {
        socket.on('verification_completed', (data: any) => {
          setEarnedPoints(data.pointsEarned);
          setShowSuccessModal(true);
        });
      }
    }

    return () => {
      disconnectSocket();
    };
  }, [user]);

  useEffect(() => {
    if (!isMounted) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect unauthenticated users to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect authenticated users to tabs
      router.replace('/(tabs)');
    }
  }, [user, segments, isMounted]);

  if (!isMounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000020" />
      </View>
    );
  }

  return (
    <>
      {activeNotification && (
        <NotificationBanner
          notification={activeNotification}
          onDismiss={() => setActiveNotification(null)}
        />
      )}
      <SuccessModal
        visible={showSuccessModal}
        title="Poin Berhasil Ditambahkan"
        message="Terima kasih telah berpartisipasi dalam program daur ulang ini!"
        points={earnedPoints}
        onConfirm={() => {
          setShowSuccessModal(false);
        }}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setor" />
        <Stack.Screen name="campaign/[id]" />
        <Stack.Screen name="pickup-detail" />
      </Stack>
    </>
  );
}
