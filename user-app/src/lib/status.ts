import type { Ionicons } from '@expo/vector-icons';
import type { PillTone } from '../ui';
import type { PickupStatus } from './types';

export const STATUS: Record<PickupStatus, { label: string; tone: PillTone; icon: keyof typeof Ionicons.glyphMap; hint: string }> = {
  waiting: { label: 'Mencari Kurir', tone: 'info', icon: 'search', hint: 'Permintaan Anda sedang diteruskan ke kurir terdekat.' },
  on_the_way: { label: 'Kurir Menuju Lokasi', tone: 'warning', icon: 'bicycle', hint: 'Kurir sedang dalam perjalanan ke lokasi Anda.' },
  arrived: { label: 'Kurir Tiba', tone: 'primary', icon: 'location', hint: 'Kurir sedang menimbang sampah Anda.' },
  pending_verification: { label: 'Menunggu Persetujuan', tone: 'warning', icon: 'qr-code', hint: 'Pindai QR di HP kurir untuk menyetujui hasil timbangan.' },
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

export const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  'Botol Plastik': { icon: 'water', color: '#0EA5E9' },
  Kertas: { icon: 'document-text', color: '#D97706' },
  Kaleng: { icon: 'beer', color: '#64748B' },
  'Botol Kaca': { icon: 'wine', color: '#10B981' },
};
