import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ArrowRight, Award, Bell, BellOff, Bike, Calendar, Camera, Check, CheckCheck, ChevronLeft, ChevronRight,
  CircleAlert, CircleCheck, CircleHelp, CircleUser, CircleX, Clock, Cloud, CloudOff, CupSoda, Ellipsis,
  EllipsisVertical, ExternalLink, Eye, EyeOff, FileText, GlassWater, Globe, Hand, Headset, Heart, Hourglass,
  House, Image, Inbox, Info, Keyboard, KeyRound, Leaf, LocateFixed, Lock, LogOut, Mail, Map, MapPin, Milk,
  Minus, Navigation, Newspaper, Package, Pencil, Phone, Plus, QrCode, Receipt, Recycle, RefreshCw, Scale,
  ScanLine, Search, Settings, ShieldCheck, Trash2, TriangleAlert, Trophy, Undo2, User, Users, Wallet, X, Zap,
  ZapOff,
  type LucideIcon,
} from 'lucide-react-native';

export type IconName = keyof typeof Ionicons.glyphMap;

// Set ikon mengikuti Figma (Lucide, garis 1,75). Nama Ionicons tetap dipakai sebagai kunci supaya
// pemanggil lama tidak berubah; varian -outline/-sharp disamakan dengan nama dasarnya.
const MAP: Record<string, LucideIcon> = {
  add: Plus,
  remove: Minus,
  'alert-circle': CircleAlert,
  'arrow-forward': ArrowRight,
  beer: CupSoda,
  bicycle: Bike,
  calendar: Calendar,
  call: Phone,
  camera: Camera,
  checkmark: Check,
  'checkmark-circle': CircleCheck,
  'checkmark-done': CheckCheck,
  'chevron-back': ChevronLeft,
  'chevron-forward': ChevronRight,
  close: X,
  'close-circle': CircleX,
  cloud: Cloud,
  'cloud-offline': CloudOff,
  create: Pencil,
  pencil: Pencil,
  cube: Package,
  'document-text': FileText,
  earth: Globe,
  globe: Globe,
  'ellipsis-horizontal': Ellipsis,
  'ellipsis-vertical': EllipsisVertical,
  eye: Eye,
  'eye-off': EyeOff,
  'file-tray': Inbox,
  flash: Zap,
  'flash-off': ZapOff,
  'hand-right': Hand,
  headset: Headset,
  heart: Heart,
  'help-circle': CircleHelp,
  home: House,
  hourglass: Hourglass,
  image: Image,
  'information-circle': Info,
  key: KeyRound,
  keypad: Keyboard,
  leaf: Leaf,
  locate: LocateFixed,
  location: MapPin,
  'lock-closed': Lock,
  'log-out': LogOut,
  mail: Mail,
  map: Map,
  navigate: Navigation,
  newspaper: Newspaper,
  notifications: Bell,
  'notifications-off': BellOff,
  open: ExternalLink,
  people: Users,
  person: User,
  'person-circle': CircleUser,
  'qr-code': QrCode,
  receipt: Receipt,
  refresh: RefreshCw,
  'return-up-back': Undo2,
  ribbon: Award,
  scale: Scale,
  scan: ScanLine,
  search: Search,
  settings: Settings,
  'shield-checkmark': ShieldCheck,
  sync: Recycle,
  time: Clock,
  'trash-bin': Trash2,
  trophy: Trophy,
  wallet: Wallet,
  warning: TriangleAlert,
  water: Milk,
  wine: GlassWater,
};

export function resolveIcon(name: string): LucideIcon | undefined {
  return MAP[name] ?? MAP[name.replace(/-(outline|sharp)$/, '')];
}

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 24, color, strokeWidth = 1.75, style }: IconProps) {
  const L = resolveIcon(name);
  // Nama yang belum dipetakan tetap tampil lewat Ionicons agar tidak pernah kosong.
  if (!L) return <Ionicons name={name} size={size} color={color} style={style as never} />;
  return <L size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}
