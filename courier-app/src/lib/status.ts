import type { Ionicons } from '@expo/vector-icons';
import type { PillTone } from '../ui';
import type { PickupStatus } from './types';

// Label dari sudut pandang kurir.
export const STATUS: Record<PickupStatus, { label: string; tone: PillTone; icon: keyof typeof Ionicons.glyphMap }> = {
  waiting: { label: 'Tersedia', tone: 'info', icon: 'flash' },
  on_the_way: { label: 'Menuju Lokasi', tone: 'warning', icon: 'bicycle' },
  arrived: { label: 'Tiba – Timbang', tone: 'primary', icon: 'scale' },
  pending_verification: { label: 'Menunggu Persetujuan', tone: 'warning', icon: 'qr-code' },
  completed: { label: 'Selesai', tone: 'success', icon: 'checkmark-circle' },
  cancelled: { label: 'Dibatalkan', tone: 'danger', icon: 'close-circle' },
};

export const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  'Botol Plastik': { icon: 'water', color: '#0EA5E9' },
  Kertas: { icon: 'document-text', color: '#D97706' },
  Kaleng: { icon: 'beer', color: '#64748B' },
  'Botol Kaca': { icon: 'wine', color: '#10B981' },
};

export const totalKg = (items: { estimated_weight: number; actual_weight: number | null }[]) =>
  items.reduce((sum, i) => sum + (i.actual_weight ?? i.estimated_weight), 0);

export const mapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
