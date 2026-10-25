// Design tokens Eco-Donation (Courier App).
// File ini SPESIFIK per aplikasi; komponen lain di src/ui disalin identik ke courier-app
// lewat `node scripts/sync-ui.js` dari root repo.

export const brand = {
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primarySoft: '#E0EAFF',
  primarySoftPressed: '#C7D7FE',
  primaryGradient: ['#1E3A8A', '#2563EB'] as const,
  onPrimary: '#FFFFFF',
};

export const colors = {
  ...brand,
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF2F7',
  border: '#E2E7EF',
  borderStrong: '#CBD3DF',
  text: '#0F172A',
  textMuted: '#526077',
  textSubtle: '#8A96A8',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
  gold: '#D4A017',
  silver: '#94A3B8',
  bronze: '#B87333',
  overlay: 'rgba(15, 23, 42, 0.55)',
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
  xl: 24,
  pill: 999,
};

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const },
  subheading: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, lineHeight: 19, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

export const shadow = {
  sm: {
    shadowColor: '#0B1530',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0B1530',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B1530',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const theme = { colors, spacing, radius, typography, shadow };
export type Theme = typeof theme;
