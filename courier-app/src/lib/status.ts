import type { Ionicons } from '@expo/vector-icons';
import type { PillTone } from '../ui';
import type { PickupStatus } from './types';

// Label dari sudut pandang kurir.
export const STATUS: Record<PickupStatus, { label: string; tone: PillTone; icon: keyof typeof Ionicons.glyphMap }> = {
  waiting: { label: 'Tersedia', tone: 'neutral', icon: 'flash' },
  on_the_way: { label: 'Menuju lokasi', tone: 'warning', icon: 'bicycle' },
  arrived: { label: 'Tiba · timbang', tone: 'primary', icon: 'scale' },
  pending_verification: { label: 'Menunggu persetujuan', tone: 'warning', icon: 'qr-code' },
  completed: { label: 'Selesai', tone: 'success', icon: 'checkmark-circle' },
  cancelled: { label: 'Dibatalkan', tone: 'danger', icon: 'close-circle' },
};

// Warna kategori = tinta dari pasangan pastel di theme.category (lihat ui/Category.tsx).
export const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  'Botol Plastik': { icon: 'water-outline', color: '#0B3B7E', bg: '#DCEEFF' },
  Kertas: { icon: 'newspaper-outline', color: '#764609', bg: '#FBEED6' },
  Kaleng: { icon: 'beer-outline', color: '#8C2416', bg: '#FDE3DF' },
  'Botol Kaca': { icon: 'wine-outline', color: '#45560C', bg: '#ECF3D5' },
};

export const totalKg = (items: { estimated_weight: number; actual_weight: number | null }[]) =>
  items.reduce((sum, i) => sum + (i.actual_weight ?? i.estimated_weight), 0);

export const mapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
