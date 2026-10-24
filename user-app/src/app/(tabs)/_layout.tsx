import React from 'react';
import { ColorValue, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../ui';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (active: IconName, idle: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : idle} size={23} color={color} />;
  };

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="katalog" options={{ title: 'Donasi', tabBarIcon: icon('heart', 'heart-outline') }} />
      <Tabs.Screen name="riwayat" options={{ title: 'Aktivitas', tabBarIcon: icon('receipt', 'receipt-outline') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
