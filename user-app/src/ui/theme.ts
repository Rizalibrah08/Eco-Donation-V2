// Design tokens Eco-Donation (User App).
// File ini SPESIFIK per aplikasi; komponen lain di src/ui disalin identik ke courier-app
// lewat `node scripts/sync-ui.js` dari root repo.
// Sumber desain: Figma "Eco-Donation — Wireframe (User & Kurir)", halaman Fondasi & Komponen.

export const brand = {
  primary: '#0A5C4C',
  primaryDark: '#084A3D',
  primarySoft: '#E3F2EE',
  primarySoftPressed: '#CFE8E1',
  /** Isian data (progress bar kampanye) — satu tingkat lebih terang dari tombol. */
  primaryData: '#0E7C66',
  onPrimary: '#FFFFFF',
};

export const colors = {
  ...brand,
  bg: '#F4F6F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F3F2',
  border: '#E3E8E6',
  rule: '#EDF1EF',
  borderStrong: '#CBD3D0',
  text: '#10201B',
  textMuted: '#56655F',
  textSubtle: '#6E7A75',
  success: '#1F7A4A',
  successSoft: '#DCFAE5',
  warning: '#8A4B06',
  warningSoft: '#FFF4DB',
  danger: '#B4232A',
  dangerSoft: '#FFECE9',
  info: '#123E8C',
  infoSoft: '#E2EEFF',
  gold: '#D4A017',
  silver: '#94A3B8',
  bronze: '#B87333',
  overlay: 'rgba(11, 26, 21, 0.55)',
};

/** Pasangan pastel + tinta senada per kategori sampah (sama di kedua aplikasi). */
export const category = {
  plastik: { bg: '#DCEEFF', ink: '#0B3B7E' },
  kertas: { bg: '#FBEED6', ink: '#764609' },
  kaleng: { bg: '#FDE3DF', ink: '#8C2416' },
  kaca: { bg: '#ECF3D5', ink: '#45560C' },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  card: 20,
  xl: 24,
  pill: 999,
};

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

// Font kustom di Android tidak memilih ketebalan lewat fontWeight, jadi tiap gaya menyebut keluarganya.
export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: fonts.semibold, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: fonts.bold, letterSpacing: -0.4 },
  heading: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold },
  subheading: { fontSize: 15, lineHeight: 22, fontFamily: fonts.semibold },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  bodySmall: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium },
  overline: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium },
};

// Permukaan dibedakan dengan garis 1px, bukan bayangan. Bayangan hanya untuk yang melayang (lembar, dialog).
const none = { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 };
export const shadow = {
  sm: none,
  md: none,
  lg: {
    shadowColor: '#0B1F18',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const theme = { colors, category, spacing, radius, fonts, typography, shadow };
export type Theme = typeof theme;
