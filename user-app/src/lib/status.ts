import type { Ionicons } from '@expo/vector-icons';
import type { PillTone } from '../ui';
import type { PickupStatus } from './types';

export const STATUS: Record<PickupStatus, { label: string; tone: PillTone; icon: keyof typeof Ionicons.glyphMap; hint: string }> = {
  waiting: { label: 'Mencari kurir', tone: 'info', icon: 'search', hint: 'Permintaan Anda sedang diteruskan ke kurir terdekat.' },
  on_the_way: { label: 'Kurir menuju lokasi', tone: 'warning', icon: 'bicycle', hint: 'Kurir sedang dalam perjalanan ke lokasi Anda.' },
  arrived: { label: 'Kurir tiba', tone: 'primary', icon: 'location', hint: 'Kurir sedang menimbang sampah Anda.' },
  pending_verification: { label: 'Menunggu persetujuan', tone: 'warning', icon: 'qr-code', hint: 'Pindai QR di HP kurir untuk menyetujui hasil timbangan.' },
  completed: { label: 'Selesai', tone: 'success', icon: 'checkmark-circle', hint: 'Poin sudah masuk ke saldo Anda.' },
  cancelled: { label: 'Dibatalkan', tone: 'danger', icon: 'close-circle', hint: 'Penjemputan ini dibatalkan.' },
};

export const TIMELINE: { status: PickupStatus; label: string }[] = [
  { status: 'waiting', label: 'Permintaan dibuat' },
  { status: 'on_the_way', label: 'Kurir menuju lokasi' },
  { status: 'arrived', label: 'Kurir tiba & menimbang' },
  { status: 'pending_verification', label: 'Persetujuan timbangan' },
  { status: 'completed', label: 'Poin diterima' },
];

export const ACTIVE_STATUSES: PickupStatus[] = ['waiting', 'on_the_way', 'arrived', 'pending_verification'];

// Warna kategori = tinta dari pasangan pastel di theme.category (lihat ui/Category.tsx).
export const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  'Botol Plastik': { icon: 'water-outline', color: '#0B3B7E', bg: '#DCEEFF' },
  Kertas: { icon: 'newspaper-outline', color: '#764609', bg: '#FBEED6' },
  Kaleng: { icon: 'beer-outline', color: '#8C2416', bg: '#FDE3DF' },
  'Botol Kaca': { icon: 'wine-outline', color: '#45560C', bg: '#ECF3D5' },
};
