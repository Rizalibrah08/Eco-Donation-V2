// Geocoding Service menggunakan Photon API (Free, No API Key)
// Photon API: https://photon.komoot.io

export interface GeocodingResult {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

export interface AddressProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
}

// Format address dari Photon properties
const formatAddress = (props: AddressProperties): string => {
  const parts = [];
  
  if (props.name) parts.push(props.name);
  if (props.street) {
    const street = props.housenumber 
      ? `${props.street} No. ${props.housenumber}`
      : props.street;
    parts.push(street);
  }
  if (props.district) parts.push(props.district);
  if (props.city) parts.push(props.city);
  if (props.state && props.state !== props.city) parts.push(props.state);
  
  return parts.length > 0 ? parts.join(', ') : 'Alamat tidak ditemukan';
};

// Forward Geocoding: Search address → koordinat
export const searchAddress = async (
  query: string,
  location?: { lat: number; lon: number }
): Promise<GeocodingResult[]> => {
  // Minimal validation: query must be at least 3 characters
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      lang: 'id',
      limit: '5',
      ...(location && { 
        lat: location.lat.toString(), 
        lon: location.lon.toString() 
      })
    });
    
    const response = await fetch(
      `https://photon.komoot.io/api?${params}`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => null);
    
    if (!response || !response.ok) {
      return [];
    }
    
    const data = await response.json().catch(() => null);
    
    if (!data?.features) {
      return [];
    }
    
    return data.features.map((f: any) => ({
      name: f.properties.name || f.properties.street || 'Unknown',
      address: formatAddress(f.properties),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0]
    }));
  } catch {
    return [];
  }
};

// Reverse Geocoding: Koordinat → address
export const reverseGeocode = async (
  lat: number,
  lon: number
): Promise<string> => {
  // Validasi koordinat
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
  
  try {
    const response = await fetch(
      `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}&lang=id`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => null);
    
    if (!response || !response.ok) {
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
    
    const data = await response.json().catch(() => null);
    
    if (data?.features?.[0]) {
      return formatAddress(data.features[0].properties);
    }
  } catch {}
  
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
};
