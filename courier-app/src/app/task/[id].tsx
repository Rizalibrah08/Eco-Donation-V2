import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Linking } from 'react-native';
import ConfirmModal from '../../components/ConfirmModal';
import SuccessModal from '../../components/SuccessModal';
import WarningModal from '../../components/WarningModal';
import ErrorModal from '../../components/ErrorModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Camera, CameraView } from 'expo-camera';
import { WebView } from 'react-native-webview';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWeighConfirmModal, setShowWeighConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // State for actual weights input
  const [actualWeights, setActualWeights] = useState<Record<string, string>>({});
  const [qrToken, setQrToken] = useState<string | null>(null);

  // Scanner & Token states
  const [showScanner, setShowScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchTaskDetail();
  }, [id]);

  const fetchTaskDetail = async () => {
    try {
      const response = await api.get(`/pickups/${id}`);
      console.log('📍 Task Detail Response:', {
        id: response.data.id,
        address: response.data.pickup_address,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        status: response.data.status
      });
      setTask(response.data);

      if (response.data.status === 'pending_verification') {
        // Just flag that it has qr_token so UI shows options
        setQrToken('pending');
      }
    } catch (error) {
      console.error('❌ Error fetching task:', error);
      setErrorMessage('Gagal memuat tugas.');
      setShowError(true);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  };

  const openMaps = () => {
    // Gunakan koordinat saja
    if (!task?.latitude || !task?.longitude) {
      setWarningMessage('Koordinat lokasi tidak tersedia');
      setShowWarning(true);
      return;
    }

    const coords = `${task.latitude},${task.longitude}`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    
    // Untuk native app, gunakan koordinat
    const mapsUrl = Platform.select({
      ios: `maps://?q=${coords}`,
      android: `geo:${task.latitude},${task.longitude}?q=${coords}`,
      default: googleMapsUrl,
    }) as string;

    Linking.canOpenURL(mapsUrl).then(supported => {
      if (supported) {
        Linking.openURL(mapsUrl);
      } else {
        // Fallback to web browser
        Linking.openURL(googleMapsUrl);
      }
    }).catch(() => {
      Linking.openURL(googleMapsUrl);
    });
  };

  const handleAcceptTask = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmAccept = async () => {
    setShowConfirmModal(false);
    setProcessing(true);
    try {
      const { user } = useAuthStore.getState();
      await api.patch(`/pickups/${id}/status`, { status: 'on_the_way', courier_id: user?.id });
      setWarningMessage('Tugas berhasil diterima! Segera menuju lokasi pengguna.');
      setShowWarning(true); // Using warning modal simply as a non-points info
      fetchTaskDetail(); // Refresh data
    } catch (error) {
      setErrorMessage('Tidak dapat menerima tugas.');
      setShowError(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateWeight = (itemId: number, weight: string) => {
    setActualWeights(prev => ({
      ...prev,
      [itemId]: weight
    }));
  };

  const handleGenerateQRPress = () => {
    const items = task.items.map((item: any) => ({
      id: item.id,
      actual_weight: parseFloat(actualWeights[item.id] || '0')
    }));

    const invalid = items.some((i: any) => isNaN(i.actual_weight) || i.actual_weight <= 0);
    if (invalid) {
      setWarningMessage('Silakan masukkan berat aktual (Kg) untuk semua barang.');
      setShowWarning(true);
      return;
    }

    setShowWeighConfirmModal(true);
  };

  const handleGenerateQR = async () => {
    setShowWeighConfirmModal(false);
    setProcessing(true);
    try {
      const items = task.items.map((item: any) => ({
        id: item.id,
        actual_weight: parseFloat(actualWeights[item.id] || '0')
      }));
      const response = await api.post(`/pickups/${id}/weigh`, { items });
      setQrToken('pending');
      setWarningMessage('Data terkirim ke User. Silakan minta User menampilkan QR atau Token untuk diverifikasi.');
      setShowWarning(true);
      fetchTaskDetail();
    } catch (error) {
      setErrorMessage('Tidak dapat memproses berat aktual.');
      setShowError(true);
    } finally {
      setProcessing(false);
    }
  };

  const openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
    if (status === 'granted') {
      setShowScanner(true);
    } else {
      setErrorMessage('Akses kamera dibutuhkan untuk scan QR.');
      setShowError(true);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    verifyToken(data);
  };

  const handleInputToken = () => {
    if (!tokenInput.trim()) {
      setWarningMessage('Silakan masukkan token verifikasi.');
      setShowWarning(true);
      return;
    }
    verifyToken(tokenInput.trim());
  };

  const verifyToken = async (tokenStr: string) => {
    setProcessing(true);
    try {
      let finalToken = tokenStr;
      let orderIdFromToken = null;
      try {
        const parsed = JSON.parse(tokenStr);
        if (parsed.token) finalToken = parsed.token;
        if (parsed.order_id) orderIdFromToken = parsed.order_id;
      } catch (e) { }

      if (orderIdFromToken && String(orderIdFromToken) !== String(id)) {
        setErrorMessage('QR Code ini untuk tugas penjemputan yang berbeda.');
        setProcessing(false);
        setShowTokenInput(false);
        setShowError(true);
        return;
      }

      const response = await api.post(`/pickups/${id}/verify`, { token: finalToken });
      setShowSuccessModal(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Token tidak valid atau sudah kadaluarsa.');
      setShowError(true);
    } finally {
      setProcessing(false);
      setShowTokenInput(false);
    }
  };

  if (loading || !task) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#1565c0', '#0d47a1']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Tugas #{task.id}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {qrToken ? (
          <View style={styles.qrContainer}>
            <LinearGradient
              colors={['#4fc3f7', '#2196f3']}
              style={styles.qrGradient}
            >
              <Ionicons name="shield-checkmark" size={80} color="#fff" style={{ marginBottom: 20 }} />
              <Text style={styles.qrTitle}>Verifikasi dari Pengguna</Text>
              <Text style={styles.qrInstruction}>
                Pengguna telah menerima rincian berat di aplikasinya. Silakan Scan QR Code dari layar Pengguna, atau masukkan Token secara manual.
              </Text>

              <TouchableOpacity
                style={styles.qrActionButton}
                onPress={openScanner}
              >
                <Ionicons name="scan" size={24} color="#1565c0" />
                <Text style={styles.qrActionText}>Scan QR Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.qrActionButton, { backgroundColor: 'rgba(255,255,255,0.3)' }]}
                onPress={() => setShowTokenInput(true)}
              >
                <Ionicons name="keypad" size={24} color="#fff" />
                <Text style={[styles.qrActionText, { color: '#fff' }]}>Masukkan Token</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <>
            {/* User Info Card with Map Button */}
            <View style={styles.infoCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="information-circle" size={24} color="#1565c0" />
                </View>
                <Text style={styles.sectionTitle}>Informasi Penjemputan</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="person" size={20} color="#4fc3f7" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Pengguna</Text>
                  <Text style={styles.infoValue}>{task.user_name}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="location" size={20} color="#ff6b6b" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Alamat Penjemputan</Text>
                  <Text style={styles.infoValue}>{task.pickup_address}</Text>
                </View>
              </View>

              {/* Embedded Map */}
              {task.latitude && task.longitude ? (
                <View style={styles.embeddedMapContainer}>
                  <WebView
                    source={{
                      html: `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
                                  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
                                  crossorigin=""/>
                            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                                    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                                    crossorigin=""></script>
                            <style>
                              * { margin: 0; padding: 0; }
                              html, body { height: 100%; width: 100%; }
                              #map { height: 100%; width: 100%; }
                            </style>
                          </head>
                          <body>
                            <div id="map"></div>
                            <script>
                              try {
                                var map = L.map('map', {
                                  zoomControl: false,
                                  attributionControl: false
                                }).setView([${task.latitude}, ${task.longitude}], 15);
                                
                                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                  maxZoom: 19,
                                  attribution: ''
                                }).addTo(map);
                                
                                var marker = L.marker([${task.latitude}, ${task.longitude}]).addTo(map);
                                marker.bindPopup('Lokasi Penjemputan').openPopup();
                                
                                var circle = L.circle([${task.latitude}, ${task.longitude}], {
                                  color: '#2196f3',
                                  fillColor: '#4fc3f7',
                                  fillOpacity: 0.2,
                                  radius: 50
                                }).addTo(map);
                                
                                setTimeout(function() {
                                  map.invalidateSize();
                                }, 200);
                              } catch(e) {
                                document.body.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">Peta tidak dapat dimuat</div>';
                              }
                            </script>
                          </body>
                        </html>
                      `
                    }}
                    style={styles.embeddedMap}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scrollEnabled={false}
                    bounces={false}
                    scalesPageToFit={true}
                    originWhitelist={['*']}
                    mixedContentMode="compatibility"
                    androidLayerType="hardware"
                    onError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.warn('WebView error: ', nativeEvent);
                    }}
                  />
                </View>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={40} color="#ccc" />
                  <Text style={styles.mapPlaceholderText}>Koordinat tidak tersedia</Text>
                </View>
              )}

              {/* Google Maps Button */}
              <View style={styles.mapsButtonContainer}>
                <TouchableOpacity 
                  style={styles.fullWidthMapButton}
                  onPress={openMaps}
                >
                  <LinearGradient
                    colors={['#66bb6a', '#43a047']}
                    style={styles.mapsGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="map" size={20} color="#fff" />
                    <Text style={styles.mapsButtonText}>Lihat Peta</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="analytics" size={20} color="#ffd93d" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={[styles.infoValue, {
                    color: task.status === 'on_the_way' ? '#ff6b6b' :
                      task.status === 'pending_verification' ? '#ffd93d' : '#4fc3f7'
                  }]}>
                    {task.status === 'waiting' ? 'Menunggu Penjemputan' :
                      task.status === 'pending_verification' ? 'Menunggu Verifikasi QR' : 'Kurir Menuju Lokasi'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items Card */}
            <View style={styles.itemsCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="cube" size={24} color="#1565c0" />
                </View>
                <Text style={styles.sectionTitle}>Daftar Barang & Timbangan</Text>
              </View>

              {task.items && task.items.map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemIconWrapper}>
                    <Ionicons 
                      name={
                        item.category.toLowerCase().includes('plastik') ? 'water' :
                        item.category.toLowerCase().includes('kertas') ? 'document' :
                        item.category.toLowerCase().includes('logam') ? 'construct' :
                        'trash'
                      } 
                      size={24} 
                      color="#1565c0" 
                    />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    <Text style={styles.itemEst}>Estimasi: {item.estimated_weight} Kg</Text>
                  </View>

                  {task.status === 'on_the_way' ? (
                    <View style={styles.weightInputContainer}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor="#999"
                        value={actualWeights[item.id] || ''}
                        onChangeText={(val) => handleUpdateWeight(item.id, val)}
                        editable={true}
                        selectTextOnFocus={true}
                        returnKeyType="done"
                        maxLength={10}
                      />
                      <Text style={styles.unitText}>Kg</Text>
                    </View>
                  ) : (
                    <Text style={styles.waitingText}>-</Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {!qrToken && (
        <View style={styles.footer}>
          {task.status === 'waiting' ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAcceptTask}
              disabled={processing}
            >
              <LinearGradient
                colors={['#ff6b6b', '#ee5a6f']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Terima & Menuju Lokasi</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : task.status === 'on_the_way' ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGenerateQRPress}
              disabled={processing}
            >
              <LinearGradient
                colors={['#4fc3f7', '#2196f3']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Kirim Data & Verifikasi</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Confirm Accept Task */}
      <ConfirmModal
        visible={showConfirmModal}
        title="Konfirmasi"
        message="Apakah Anda yakin ingin menerima tugas ini?"
        confirmText="Terima Tugas"
        onConfirm={handleConfirmAccept}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Confirm Generate QR */}
      <ConfirmModal
        visible={showWeighConfirmModal}
        title="Konfirmasi Timbangan"
        message="Apakah data berat yang dimasukkan sudah benar? Data ini akan dikirim ke User untuk diverifikasi."
        confirmText="Ya, Kirim"
        onConfirm={handleGenerateQR}
        onCancel={() => setShowWeighConfirmModal(false)}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Verifikasi Berhasil"
        message="Poin telah ditransfer ke User."
        onConfirm={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)');
        }}
      />

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowScanner(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR User</Text>
            <View style={{ width: 28 }} />
          </View>
          {hasCameraPermission ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
          ) : (
            <View style={styles.loader}><Text style={{ color: 'white' }}>Meminta akses kamera...</Text></View>
          )}
        </View>
      </Modal>

      {/* Token Input Modal */}
      <Modal visible={showTokenInput} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Masukkan Token</Text>
            <Text style={styles.modalSubtitle}>Minta 6 digit token dari aplikasi pengguna.</Text>
            <TextInput
              style={styles.tokenInput}
              placeholder="Contoh: AB3F2K"
              value={tokenInput}
              onChangeText={(text) => setTokenInput(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ccc' }]} onPress={() => setShowTokenInput(false)}>
                <Text style={styles.modalBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#1565c0' }]} onPress={handleInputToken}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Verifikasi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <WarningModal
        visible={showWarning}
        title="Perhatian"
        message={warningMessage}
        onConfirm={() => setShowWarning(false)}
      />

      <ErrorModal
        visible={showError}
        title="Gagal"
        message={errorMessage}
        onConfirm={() => setShowError(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    lineHeight: 22,
  },
  mapsButtonContainer: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  embeddedMapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#e3f2fd',
  },
  embeddedMap: {
    flex: 1,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  fullWidthMapButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapsButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  mapsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingVertical: 16,
  },
  itemIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemEst: {
    fontSize: 13,
    color: '#666',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    width: 100,
    height: 44,
    borderWidth: 2,
    borderColor: '#e3f2fd',
  },
  weightInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565c0',
    textAlign: 'center',
    padding: 0,
  },
  unitText: {
    fontSize: 14,
    color: '#999',
    fontWeight: 'bold',
  },
  waitingText: {
    fontSize: 14,
    color: '#ccc',
    fontStyle: 'italic',
  },
  qrContainer: {
    marginTop: 20,
  },
  qrGradient: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  qrInstruction: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
    width: '100%',
    gap: 8,
  },
  qrActionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  tokenInput: {
    backgroundColor: '#f5f7fa',
    width: '100%',
    height: 60,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1565c0',
    letterSpacing: 4,
    borderWidth: 2,
    borderColor: '#e3f2fd',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalBtnText: {
    fontWeight: 'bold',
    fontSize: 15,
  }
});
