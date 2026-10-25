const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const pad = (n: number) => String(n).padStart(2, '0');

export function formatNumber(n: number | null | undefined, digits = 0): string {
  const value = Number(n || 0);
  const fixed = value.toFixed(digits);
  const [int, dec] = fixed.split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec && Number(dec) !== 0 ? `${withDots},${dec.replace(/0+$/, '')}` : withDots;
}

export const formatPoints = (n: number | null | undefined) => `${formatNumber(n)} poin`;
export const formatRupiah = (n: number | null | undefined) => `Rp${formatNumber(n)}`;
export const formatKg = (n: number | null | undefined) => `${formatNumber(n, 2)} kg`;

export function compactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${formatNumber(n / 1_000_000_000, 1)} M`;
  if (n >= 1_000_000) return `${formatNumber(n / 1_000_000, 1)} jt`;
  if (n >= 1_000) return `${formatNumber(n / 1_000, 1)} rb`;
  return formatNumber(n);
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

export function formatDate(iso: string, withYear = true) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatDayLabel(date: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Hari ini';
  if (date.toDateString() === tomorrow.toDateString()) return 'Besok';
  return DAYS[date.getDay()];
}

export function formatSchedule(iso: string) {
  const d = new Date(iso);
  return `${formatDayLabel(d)}, ${d.getDate()} ${MONTHS[d.getMonth()]} · ${formatTime(iso)}`;
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(iso);
}

export function daysLeft(date: string | null) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return diff;
}
