import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { View, ActivityIndicator, Text } from 'react-native';

export default function RootLayout() {
  const { isHydrated } = useAuthStore();

  useEffect(() => {
    console.log('Root Layout - Hydrated:', isHydrated);
  }, [isHydrated]);

  // Tampilkan loading sampai store ready
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1565c0" />
        <Text style={{ marginTop: 12, color: '#666' }}>Memuat aplikasi...</Text>
      </View>
    );
  }

  // Gunakan Slot agar tidak ada interference dengan navigation
  return <Slot />;
}
