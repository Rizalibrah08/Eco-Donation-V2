import React from 'react';
import { ColorValue, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, Icon } from '../../ui';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (active: IconName, idle: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // Set ikon outline yang sama; status aktif ditandai warna, bukan ikon terisi.
    return <Icon name={focused ? active : idle} size={22} color={color as string} />;
  };

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontFamily: fonts.medium },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: icon('home-outline', 'home-outline') }} />
      <Tabs.Screen name="katalog" options={{ title: 'Donasi', tabBarIcon: icon('heart-outline', 'heart-outline') }} />
      <Tabs.Screen name="riwayat" options={{ title: 'Aktivitas', tabBarIcon: icon('time-outline', 'time-outline') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('person-outline', 'person-outline') }} />
    </Tabs>
  );
}
