import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect } from 'react';

export default function Index() {
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    console.log('Index - User:', !!user, 'Hydrated:', isHydrated);
  }, [user, isHydrated]);

  // Tunggu hydration selesai
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1565c0" />
        <Text style={{ marginTop: 12, color: '#666' }}>Memuat...</Text>
      </View>
    );
  }

  console.log('Index - Redirecting to:', user ? '/(tabs)' : '/(auth)/login');

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
