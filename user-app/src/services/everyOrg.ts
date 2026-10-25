import axios from 'axios';

// Every.org Partner API (publishable key, aman di client). Bisa diganti lewat EXPO_PUBLIC_EVERYORG_KEY.
const API_KEY = process.env.EXPO_PUBLIC_EVERYORG_KEY || 'pk_live_9dc233356a81a71f93aacbf54e41eaf5';
const BASE = 'https://partners.every.org/v0.2';

export interface GlobalNonprofit {
  id: string; // EIN atau slug — dipakai sebagai external_id saat donasi
  name: string;
  description: string;
  imageUrl: string | null;
  logoUrl: string | null;
  location: string | null;
  profileUrl: string | null;
}

function map(item: any): GlobalNonprofit {
  return {
    id: String(item.ein || item.slug || item.primarySlug),
    name: item.name,
    description: item.descriptionLong || item.description || 'Organisasi nirlaba global di bidang lingkungan.',
    imageUrl: item.coverImageUrl || null,
    // Logo dari API berukuran 24px; minta versi lebih besar agar tajam.
    logoUrl: item.logoUrl ? String(item.logoUrl).replace('w_24,h_24', 'w_96,h_96') : null,
    location: item.location || item.locationAddress || null,
    profileUrl: item.profileUrl || null,
  };
}

export async function browseNonprofits(page = 1, take = 20): Promise<{ items: GlobalNonprofit[]; hasMore: boolean }> {
  const { data } = await axios.get(`${BASE}/browse/environment`, {
    params: { apiKey: API_KEY, take, page },
    timeout: 10000,
  });
  const items = (data.nonprofits || []).map(map);
  const totalPages = data.pagination?.pages ?? page;
  return { items, hasMore: page < totalPages && items.length > 0 };
}

export async function searchNonprofits(query: string): Promise<GlobalNonprofit[]> {
  const { data } = await axios.get(`${BASE}/search/${encodeURIComponent(query)}`, {
    params: { apiKey: API_KEY, take: 30, causes: 'environment' },
    timeout: 10000,
  });
  return (data.nonprofits || []).map(map);
}

export async function getNonprofit(id: string): Promise<GlobalNonprofit> {
  const { data } = await axios.get(`${BASE}/nonprofit/${encodeURIComponent(id)}`, {
    params: { apiKey: API_KEY },
    timeout: 10000,
  });
  return map(data.data.nonprofit);
}
