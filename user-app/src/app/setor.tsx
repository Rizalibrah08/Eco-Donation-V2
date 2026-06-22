import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import ConfirmModal from '../components/ConfirmModal';
import WarningModal from '../components/WarningModal';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { searchAddress, reverseGeocode, GeocodingResult } from '../services/geocodingService';
import { useDebounce } from '../hooks/useDebounce';
import * as Location from 'expo-location';

// Native modules
let DateTimePicker: any = null;

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (err) {
    DateTimePicker = null;
  }
}

// Poin per Kg
const RATES = {
  'Botol Plastik': 800,
  'Kertas': 600,
  'Kaleng': 1000,
  'Botol Kaca': 500,
};

export default function SetorScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [categories, setCategories] = useState<{ name: string, weight: string }[]>([
    { name: 'Botol Plastik', weight: '' }
  ]);
  const [address, setAddress] = useState('');

  // Date and Time state
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Map state (defaulting to Jakarta)
  const [location, setLocation] = useState({
    latitude: -6.200000,
    longitude: 106.816666,
  });
  const [hasInteracted, setHasInteracted] = useState(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [reverseGeocodedAddress, setReverseGeocodedAddress] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Map control state
  const [mapReady, setMapReady] = useState(false);
  const webViewRef = useRef<any>(null);

  // Generate HTML untuk Leaflet Map
  const generateMapHTML = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${location.latitude}, ${location.longitude}], 15);
        
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var marker = L.marker([${location.latitude}, ${location.longitude}], { draggable: true }).addTo(map);

        marker.on('dragend', function(e) {
          var pos = marker.getLatLng();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'marker-moved',
            latitude: pos.lat,
            longitude: pos.lng
          }));
        });

        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'marker-moved',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }));
        });

        // Listen for location updates from React Native
        window.updateLocation = function(lat, lng) {
          marker.setLatLng([lat, lng]);
          map.setView([lat, lng], 15);
        };
      </script>
    </body>
    </html>
  `;

  // Handle WebView messages
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker-moved') {
        setHasInteracted(true);
        setLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    } catch (err) {
      console.error('WebView message error:', err);
    }
  };

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const availableCategories = Object.keys(RATES);

  // Search autocomplete effect
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    searchAddress(debouncedQuery, { lat: location.latitude, lon: location.longitude })
      .then(setSuggestions)
      .catch(console.error)
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  // Reverse geocode on map move (debounced)
  const debouncedLocation = useDebounce(location, 500);
  useEffect(() => {
    if (!hasInteracted) return;
    reverseGeocode(debouncedLocation.latitude, debouncedLocation.longitude)
      .then(setReverseGeocodedAddress);
  }, [debouncedLocation, hasInteracted]);

  const handleSelectSuggestion = (result: GeocodingResult) => {
    setHasInteracted(true);
    setLocation({
      latitude: result.lat,
      longitude: result.lon,
    });

    // Update WebView map
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        updateLocation(${result.lat}, ${result.lon});
        true;
      `);
    }

    setSearchQuery('');
    setSuggestions([]);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWarningMessage('Izin akses lokasi diperlukan untuk fitur ini.');
        setShowWarning(true);
        return;
      }

      setLoading(true);
      const currentLocation = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(newLocation);

      // Update WebView map
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          updateLocation(${newLocation.latitude}, ${newLocation.longitude});
          true;
        `);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setWarningMessage('Gagal mendapatkan lokasi Anda.');
      setShowWarning(true);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    setCategories([...categories, { name: availableCategories[0], weight: '' }]);
  };

  const removeCategory = (index: number) => {
    const newCats = [...categories];
    newCats.splice(index, 1);
    setCategories(newCats);
  };

  const updateCategory = (index: number, field: 'name' | 'weight', value: string) => {
    const newCats = [...categories];
    newCats[index] = { ...newCats[index], [field]: value };
    setCategories(newCats);
  };

  const estimatedPoints = useMemo(() => {
    return categories.reduce((total, cat) => {
      const weight = parseFloat(cat.weight) || 0;
      const rate = RATES[cat.name as keyof typeof RATES] || 0;
      return total + (weight * rate);
    }, 0);
  }, [categories]);

  const handleSubmit = () => {
    if (!address.trim()) {
      setWarningMessage('Silakan isi detail alamat penjemputan.');
      setShowWarning(true);
      return;
    }

    // Validate operational hours & day
    const day = date.getDay();
    if (day === 0) {
      setWarningMessage('Maaf, penjemputan libur setiap hari Minggu.');
      setShowWarning(true);
      return;
    }

    const hours = time.getHours();
    if (hours < 7 || hours >= 19) {
      setWarningMessage('Jam operasional penjemputan adalah pukul 07:00 - 19:00.');
      setShowWarning(true);
      return;
    }

    const items = categories
      .filter(c => parseFloat(c.weight) > 0)
      .map(c => ({ category: c.name, estimated_weight: parseFloat(c.weight) }));

    if (items.length === 0) {
      setWarningMessage('Silakan masukkan minimal 1 barang dengan berat > 0.');
      setShowWarning(true);
      return;
    }

    const totalWeight = items.reduce((sum, item) => sum + item.estimated_weight, 0);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);

    const items = categories
      .filter(c => parseFloat(c.weight) > 0)
      .map(c => ({ category: c.name, estimated_weight: parseFloat(c.weight) }));

    setLoading(true);
    try {
      // Format datetime to string
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const formattedTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      const scheduledAtStr = `${formattedDate} ${formattedTime}`;

      await api.post('/pickups', {
        user_id: user?.id,
        pickup_address: address,
        scheduled_at: scheduledAtStr,
        latitude: location.latitude,
        longitude: location.longitude,
        items
      });

      setSuccessMessage('Permintaan penjemputan berhasil dibuat. Kurir akan segera menuju lokasimu!');
      setShowSuccessModal(true);
    } catch (error: any) {
      setWarningMessage(error.response?.data?.error || error.response?.data?.message || 'Terjadi kesalahan server');
      setShowWarning(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <LinearGradient colors={['#004d40', '#00bfa5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setor Sampah</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Detail Barang</Text>

        {categories.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kategori</Text>
                {/* Simplified dropdown alternative for mobile */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                  {availableCategories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, item.name === cat && styles.chipActive]}
                      onPress={() => updateCategory(index, 'name', cat)}
                    >
                      <Text style={[styles.chipText, item.name === cat && styles.chipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 15 }]}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Estimasi Berat (Kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  value={item.weight}
                  onChangeText={(val) => updateCategory(index, 'weight', val)}
                />
              </View>
              {categories.length > 1 && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeCategory(index)}>
                  <Ionicons name="trash-outline" size={24} color="#ff5252" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
          <Ionicons name="add-circle-outline" size={20} color="#00bfa5" />
          <Text style={styles.addBtnText}>Tambah Kategori</Text>
        </TouchableOpacity>

        <View style={styles.estimationCard}>
          <Text style={styles.estimationLabel}>Estimasi Poin Didapat:</Text>
          <Text style={styles.estimationValue}>+{estimatedPoints.toLocaleString('id-ID')} Poin</Text>
        </View>

        <Text style={styles.sectionTitle}>Informasi Penjemputan</Text>

        {/* Search Address Autocomplete */}
        <View style={[styles.inputGroup, { marginBottom: 15, zIndex: 1000 }]}>
          <Text style={styles.label}>Cari Lokasi Penjemputan</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari alamat (min 3 karakter)..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && <ActivityIndicator size="small" color="#00bfa5" />}
          </View>

          {/* Dropdown suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={suggestions}
                keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionAddress}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
                nestedScrollEnabled={true}
              />
            </View>
          )}
        </View>

        <View style={[styles.inputGroup, { marginBottom: 15 }]}>
          <View style={styles.mapHeader}>
            <Text style={styles.label}>Tentukan Lokasi Peta Akurat</Text>
            <TouchableOpacity
              style={styles.currentLocationBtn}
              onPress={handleUseCurrentLocation}
            >
              <Ionicons name="navigate" size={16} color="#00bfa5" />
              <Text style={styles.currentLocationText}>Lokasi Saya</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: generateMapHTML() }}
              style={styles.map}
              onMessage={handleWebViewMessage}
              onLoadEnd={() => setMapReady(true)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
            
            {!mapReady && (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#00bfa5" />
                <Text style={styles.mapLoadingText}>Memuat peta...</Text>
              </View>
            )}
          </View>

          {/* Location info display */}
          <View style={styles.locationInfo}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.locationAddress}>
                {reverseGeocodedAddress || 'Memuat alamat...'}
              </Text>
              <Text style={styles.locationCoords}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            </View>
          </View>

          <Text style={styles.mapHint}>💡 Klik/tap pada peta atau drag marker untuk mengatur lokasi</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Detail Alamat Lengkap</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
            placeholder="Contoh: Jl. Sudirman No. 12, Kost Biru Kamar 4"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={[styles.inputGroup, { marginTop: 15 }]}>
          <Text style={styles.label}>Jadwal Penjemputan (07:00 - 19:00, Senin-Sabtu)</Text>
          <View style={styles.datetimeRow}>
            <TouchableOpacity style={[styles.datetimeButton, { marginRight: 10 }]} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.datetimeText}>
                {date.toLocaleDateString('id-ID')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.datetimeButton} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.datetimeText}>
                {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && Platform.OS !== 'web' && DateTimePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event: any, selectedDate: any) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {showTimePicker && Platform.OS !== 'web' && DateTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={(event: any, selectedTime: any) => {
                setShowTimePicker(false);
                if (selectedTime) setTime(selectedTime);
              }}
            />
          )}

          {Platform.OS === 'web' && (showDatePicker || showTimePicker) && (
            <Text style={{ color: '#ff5252', marginTop: 10, fontSize: 12 }}>
              Pemilih tanggal & waktu native hanya tersedia di Mobile. Gunakan aplikasi untuk mengatur jadwal.
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Konfirmasi Penjemputan</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Custom Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)/riwayat');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#00bfa5" />
            </View>
            <Text style={styles.modalTitle}>Sukses</Text>
            <Text style={styles.modalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)/riwayat');
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={showConfirmModal}
        title="Konfirmasi Penjemputan"
        message={`Anda akan menyetorkan ${categories.filter(c => parseFloat(c.weight) > 0).length} jenis barang (Total: ${categories.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0)} Kg).\nEstimasi Poin: +${estimatedPoints.toLocaleString('id-ID')}\n\nLanjutkan?`}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />

      <WarningModal
        visible={showWarning}
        title="Peringatan"
        message={warningMessage}
        onConfirm={() => setShowWarning(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 25,
    marginBottom: 15,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputGroup: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: '#004d40',
  },
  chipText: {
    color: '#666',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  removeBtn: {
    marginLeft: 15,
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#00bfa5',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  addBtnText: {
    color: '#00bfa5',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  estimationCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  estimationLabel: {
    fontSize: 14,
    color: '#2e7d32',
  },
  estimationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginTop: 5,
  },
  submitBtn: {
    backgroundColor: '#00bfa5',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    elevation: 5,
    shadowColor: '#00bfa5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 220,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
  },
  currentLocationText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#00bfa5',
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  locationCoords: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  mapHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  datetimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datetimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  datetimeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successIconContainer: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#00bfa5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
