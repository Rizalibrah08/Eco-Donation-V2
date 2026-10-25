export type PickupStatus =
  | 'waiting'
  | 'on_the_way'
  | 'arrived'
  | 'pending_verification'
  | 'completed'
  | 'cancelled';

export interface Courier {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: number;
  created_at?: string;
  role: 'courier';
  completed_count?: number;
  total_kg?: number;
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
  created_at: string;
  user_name?: string;
  user_phone?: string | null;
  items: PickupItem[];
}

export interface VerificationCode {
  code: string;
  qr_payload: string;
  expires_at: string;
}
