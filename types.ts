
export type PackageKey = 'kids' | 'teen' | 'adult' | 'baby' | 'gender' | 'eighteen' | 'slavlja';

export interface ExtraServices {
  tables: number;
  waiterHours: number;
  ledKg: number;
  photographer: boolean;
  decoration: boolean;
  catering: boolean;
  makeup: boolean;
  dj: boolean;
}

export interface Reservation {
  id: string;
  package_type: PackageKey;
  space: 'open' | 'closed';
  guest_count: number;
  date: string;
  time_slot: string;
  extras: ExtraServices;
  total_price: number;
  deposit_paid: boolean;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
}

export interface PackageConfig {
  name: string;
  emoji: string;
  duration: string;
  inclusions: string;
  slots: string[];
  maxGuests: { open: number; closed: number };
  minChildren?: number;
  minAdults?: number;
  calcPrice: (...args: any[]) => number;
}
