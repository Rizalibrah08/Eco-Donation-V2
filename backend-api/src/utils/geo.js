// Jarak dua koordinat dalam meter (rumus haversine).
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// Estimasi waktu tempuh motor di kota (~25 km/jam), minimal 1 menit.
function etaMinutes(meters) {
  return Math.max(1, Math.ceil(meters / ((25 * 1000) / 60)));
}

module.exports = { distanceMeters, etaMinutes };
