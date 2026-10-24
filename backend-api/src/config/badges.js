// Definisi lencana. `metric` adalah kolom pada tabel users.
const BADGES = [
  {
    key: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Total sampah yang berhasil didaur ulang.',
    metric: 'total_kg',
    unit: 'kg',
    icon: 'leaf',
    tiers: { bronze: 10, silver: 50, gold: 150 },
  },
  {
    key: 'recycling_hero',
    name: 'Recycling Hero',
    description: 'Jumlah penyetoran sampah yang selesai diverifikasi.',
    metric: 'total_setor_count',
    unit: 'kali',
    icon: 'refresh',
    tiers: { bronze: 1, silver: 10, gold: 30 },
  },
  {
    key: 'kind_heart',
    name: 'Kind Heart',
    description: 'Jumlah donasi yang telah Anda salurkan.',
    metric: 'total_donasi_count',
    unit: 'kali',
    icon: 'heart',
    tiers: { bronze: 1, silver: 5, gold: 20 },
  },
  {
    key: 'top_donor',
    name: 'Top Donor',
    description: 'Total poin yang telah Anda donasikan.',
    metric: 'total_donations_rp',
    unit: 'poin',
    icon: 'trophy',
    tiers: { bronze: 5000, silver: 25000, gold: 100000 },
  },
];

const TIER_ORDER = ['bronze', 'silver', 'gold'];
const TIER_LABEL = { bronze: 'Perunggu', silver: 'Perak', gold: 'Emas' };

module.exports = { BADGES, TIER_ORDER, TIER_LABEL };
