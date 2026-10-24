// Poin per kilogram untuk setiap kategori sampah.
const RATES = {
  'Botol Plastik': 800,
  'Kertas': 600,
  'Kaleng': 1000,
  'Botol Kaca': 500,
};

const CATEGORIES = Object.keys(RATES);
const CO2_PER_KG = 1.5;
const POINT_TO_RUPIAH = 1;
const MIN_DONATION = 1000;

const round2 = (n) => Math.round(n * 100) / 100;

// items: [{ category, weight }]
function calculate(items) {
  let totalPoints = 0;
  let totalKg = 0;
  const lines = items.map((item) => {
    const points = Math.round(item.weight * (RATES[item.category] || 0));
    totalPoints += points;
    totalKg += item.weight;
    return { ...item, points };
  });
  return {
    lines,
    total_points: totalPoints,
    total_kg: round2(totalKg),
    co2: round2(totalKg * CO2_PER_KG),
  };
}

module.exports = { RATES, CATEGORIES, CO2_PER_KG, POINT_TO_RUPIAH, MIN_DONATION, calculate };
