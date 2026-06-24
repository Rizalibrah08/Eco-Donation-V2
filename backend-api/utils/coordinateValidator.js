/**
 * Coordinate Validation Utility
 * Validates geographic coordinates for global range, Indonesia bounds, and swapped detection
 */

// Global coordinate ranges
const GLOBAL_LAT_MIN = -90;
const GLOBAL_LAT_MAX = 90;
const GLOBAL_LNG_MIN = -180;
const GLOBAL_LNG_MAX = 180;

// Indonesia bounds (approximate)
const INDONESIA_LAT_MIN = -11;
const INDONESIA_LAT_MAX = 6;
const INDONESIA_LNG_MIN = 95;
const INDONESIA_LNG_MAX = 141;

/**
 * Validate coordinates are within global range
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateCoordinates(lat, lng) {
  // Check if values are numbers
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return {
      valid: false,
      error: 'Koordinat tidak valid: latitude dan longitude harus berupa angka'
    };
  }

  // Check if values are NaN or Infinity
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return {
      valid: false,
      error: 'Koordinat tidak valid: latitude dan longitude harus berupa angka yang valid'
    };
  }

  // Validate latitude range
  if (lat < GLOBAL_LAT_MIN || lat > GLOBAL_LAT_MAX) {
    return {
      valid: false,
      error: `Koordinat tidak valid: latitude harus antara ${GLOBAL_LAT_MIN} sampai ${GLOBAL_LAT_MAX}`
    };
  }

  // Validate longitude range
  if (lng < GLOBAL_LNG_MIN || lng > GLOBAL_LNG_MAX) {
    return {
      valid: false,
      error: `Koordinat tidak valid: longitude harus antara ${GLOBAL_LNG_MIN} sampai ${GLOBAL_LNG_MAX}`
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate coordinates are within Indonesia bounds
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} { valid: boolean, warning: string|null }
 */
function validateIndonesiaBounds(lat, lng) {
  const inLatRange = lat >= INDONESIA_LAT_MIN && lat <= INDONESIA_LAT_MAX;
  const inLngRange = lng >= INDONESIA_LNG_MIN && lng <= INDONESIA_LNG_MAX;

  if (!inLatRange || !inLngRange) {
    return {
      valid: false,
      warning: `Peringatan: Lokasi di luar Indonesia (lat: ${lat}, lng: ${lng})`
    };
  }

  return { valid: true, warning: null };
}

/**
 * Detect if coordinates are swapped (lat/lng reversed)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} { swapped: boolean, error: string|null }
 */
function detectSwappedCoordinates(lat, lng) {
  // Detect if latitude value is in longitude range of Indonesia
  // AND longitude value is in latitude range of Indonesia
  const latInLngRange = lat >= INDONESIA_LNG_MIN && lat <= INDONESIA_LNG_MAX;
  const lngInLatRange = lng >= INDONESIA_LAT_MIN && lng <= INDONESIA_LAT_MAX;

  if (latInLngRange && lngInLatRange) {
    return {
      swapped: true,
      error: 'Koordinat terdeteksi terbalik. Pastikan format: latitude, longitude'
    };
  }

  return { swapped: false, error: null };
}

/**
 * Full validation with all checks
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} { valid: boolean, error: string|null, warning: string|null }
 */
function validateFull(lat, lng) {
  // First check global range
  const globalCheck = validateCoordinates(lat, lng);
  if (!globalCheck.valid) {
    return { valid: false, error: globalCheck.error, warning: null };
  }

  // Check for swapped coordinates
  const swapCheck = detectSwappedCoordinates(lat, lng);
  if (swapCheck.swapped) {
    return { valid: false, error: swapCheck.error, warning: null };
  }

  // Check Indonesia bounds (warning only, not error)
  const indonesiaCheck = validateIndonesiaBounds(lat, lng);
  
  return {
    valid: true,
    error: null,
    warning: indonesiaCheck.warning
  };
}

module.exports = {
  validateCoordinates,
  validateIndonesiaBounds,
  detectSwappedCoordinates,
  validateFull
};
