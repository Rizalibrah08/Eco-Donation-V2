import { useEffect, useState } from 'react';
import api from '../services/api';
import type { Rates } from '../lib/types';

// Nilai cadangan bila backend belum terjangkau; nilai sebenarnya selalu dari /config/rates.
const FALLBACK: Rates = {
  rates: { 'Botol Plastik': 800, Kertas: 600, Kaleng: 1000, 'Botol Kaca': 500 },
  co2_per_kg: 1.5,
  point_to_rupiah: 1,
  min_donation: 1000,
};

let cache: Rates | null = null;

export function useRates() {
  const [rates, setRates] = useState<Rates>(cache || FALLBACK);
  useEffect(() => {
    if (cache) return;
    api.get<Rates>('/config/rates').then(({ data }) => {
      cache = data;
      setRates(data);
    }).catch(() => {});
  }, []);
  return rates;
}
