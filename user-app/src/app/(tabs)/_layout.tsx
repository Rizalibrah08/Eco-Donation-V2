import React from 'react';
import { ColorValue } from 'react-native';
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
        // Plus Jakarta Sans lebih tinggi dari font sistem: beri label ruang baris sendiri agar tidak terpotong.
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium, marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + Math.max(insets.bottom, 10),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
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
