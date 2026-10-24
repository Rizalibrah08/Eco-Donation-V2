export type PickupStatus =
  | 'waiting'
  | 'on_the_way'
  | 'arrived'
  | 'pending_verification'
  | 'completed'
  | 'cancelled';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
  unit: string;
  value: number;
  tier: BadgeTier | null;
  tiers: Record<BadgeTier, number>;
  next_tier: BadgeTier | null;
  next_target: number | null;
  progress: number;
  unlocked_at: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  points: number;
  total_kg: number;
  total_co2: number;
  total_donations_rp: number;
  total_setor_count: number;
  total_donasi_count: number;
  created_at: string;
  role: 'user';
  badges?: Badge[];
}

export interface PickupItem {
  id: number;
  order_id: number;
  category: string;
  estimated_weight: number;
  actual_weight: number | null;
}

export interface PickupOrder {
  id: number;
  user_id: number;
  courier_id: number | null;
  status: PickupStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  scheduled_at: string;
  code_expires_at: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  weighed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  courier_name?: string | null;
  courier_phone?: string | null;
  courier_lat?: number | null;
  courier_lng?: number | null;
  courier_location_at?: string | null;
  items: PickupItem[];
}

export interface VerificationSummary {
  order_id: number;
  courier_name: string | null;
  expires_at: string | null;
  items: { id: number; category: string; estimated_weight: number; actual_weight: number | null; points: number }[];
  total_points: number;
  total_kg: number;
  co2: number;
}

export interface Transaction {
  id: number;
  type: 'setor' | 'donasi';
  title: string;
  description: string | null;
  points: number;
  ref_type: string | null;
  ref_id: number | null;
  created_at: string;
}

export interface Campaign {
  id: number;
  title: string;
  description: string | null;
  category: string;
  organizer: string | null;
  target_amount: number | null;
  collected_amount: number;
  donor_count: number;
  image_url: string | null;
  location: string | null;
  deadline: string | null;
  is_urgent: number;
  updates: { date: string; text: string }[];
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  order_id: number | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface Rates {
  rates: Record<string, number>;
  co2_per_kg: number;
  point_to_rupiah: number;
  min_donation: number;
}

export interface LocationUpdate {
  orderId: number;
  lat: number;
  lng: number;
  distance_m: number;
  eta_min: number;
  at: string;
}
