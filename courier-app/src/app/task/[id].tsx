import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import ConfirmModal from '../../components/ConfirmModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Camera, CameraView } from 'expo-camera';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWeighConfirmModal, setShowWeighConfirmModal] = useState(false);
  
  // State for actual weights input
  const [actualWeights, setActualWeights] = useState<Record<string, string>>({});
  const [qrToken, setQrToken] = useState<string | null>(null);

  // Scanner & Token states
  const [showScanner, setShowScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    fetchTaskDetail();
  }, [id]);

  const fetchTaskDetail = async () => {
    try {
      const response = await api.get(`/pickups/${id}`);
      setTask(response.data);
      
      if (response.data.status === 'pending_verification') {
        // Just flag that it has qr_token so UI shows options
        setQrToken('pending');
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat tugas.');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
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
      Alert.alert('Sukses', 'Tugas berhasil diterima! Segera menuju lokasi pengguna.');
      fetchTaskDetail(); // Refresh data
    } catch (error) {
      Alert.alert('Gagal', 'Tidak dapat menerima tugas.');
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
      Alert.alert('Input Tidak Valid', 'Silakan masukkan berat aktual (Kg) untuk semua barang.');
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
      Alert.alert('Sukses', 'Data terkirim ke User. Silakan minta User menampilkan QR atau Token untuk diverifikasi.');
      fetchTaskDetail();
    } catch (error) {
      Alert.alert('Gagal', 'Tidak dapat memproses berat aktual.');
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
      Alert.alert('Akses Ditolak', 'Akses kamera dibutuhkan untuk scan QR.');
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    verifyToken(data);
  };

  const handleInputToken = () => {
    if (!tokenInput.trim()) return;
    verifyToken(tokenInput.trim());
  };

  const verifyToken = async (tokenStr: string) => {
    setProcessing(true);
    try {
      let finalToken = tokenStr;
      try {
        const parsed = JSON.parse(tokenStr);
        if (parsed.token) finalToken = parsed.token;
      } catch (e) {}

      const response = await api.post(`/pickups/${id}/verify`, { token: finalToken });
      Alert.alert('Sukses', 'Verifikasi berhasil! Poin telah ditransfer ke User.', [
        { text: 'Selesai', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.error || 'Token tidak valid atau sudah kadaluarsa.');
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Tugas #{task.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {qrToken ? (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>Verifikasi dari Pengguna</Text>
            <Ionicons name="qr-code-outline" size={80} color="#1565c0" style={{marginBottom: 20}} />
            <Text style={styles.qrInstruction}>
              Pengguna telah menerima rincian berat di aplikasinya. Silakan Scan QR Code dari layar Pengguna, atau masukkan Token secara manual.
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#1565c0', width: '100%', marginTop: 20 }]} 
              onPress={openScanner}
            >
              <Text style={styles.actionButtonText}>Scan QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#e65100', width: '100%', marginTop: 15 }]} 
              onPress={() => setShowTokenInput(true)}
            >
              <Text style={styles.actionButtonText}>Masukkan Token</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Informasi Penjemputan</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color="#1565c0" style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Pengguna</Text>
                  <Text style={styles.infoValue}>{task.user_name}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#1565c0" style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Alamat</Text>
                  <Text style={styles.infoValue}>{task.pickup_address}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color="#1565c0" style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={[styles.infoValue, { 
                    color: task.status === 'on_the_way' ? '#e65100' : 
                           task.status === 'pending_verification' ? '#ffb300' : '#1565c0' 
                  }]}>
                    {task.status === 'waiting' ? 'Menunggu Penjemputan' : 
                     task.status === 'pending_verification' ? 'Menunggu Verifikasi QR' : 'Kurir Menuju Lokasi'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.itemsCard}>
              <Text style={styles.sectionTitle}>Daftar Barang & Timbangan</Text>
              
              {task.items && task.items.map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    <Text style={styles.itemEst}>Estimasi: {item.estimated_weight} Kg</Text>
                  </View>
                  
                  {task.status === 'on_the_way' ? (
                    <View style={styles.weightInputContainer}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="numeric"
                        placeholder="0.0"
                        placeholderTextColor="#999"
                        value={actualWeights[item.id] || ''}
                        onChangeText={(val) => handleUpdateWeight(item.id, val)}
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
              style={[styles.actionButton, { backgroundColor: '#e65100' }]} 
              onPress={handleAcceptTask}
              disabled={processing}
            >
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Terima & Menuju Lokasi</Text>}
            </TouchableOpacity>
          ) : task.status === 'on_the_way' ? (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#1565c0' }]} 
              onPress={handleGenerateQRPress}
              disabled={processing}
            >
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Kirim Data & Verifikasi</Text>}
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

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <View style={{flex: 1, backgroundColor: 'black'}}>
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
            <View style={styles.loader}><Text style={{color: 'white'}}>Meminta akses kamera...</Text></View>
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
            <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20}}>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#ccc'}]} onPress={() => setShowTokenInput(false)}>
                <Text style={styles.modalBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#1565c0'}]} onPress={handleInputToken}>
                <Text style={[styles.modalBtnText, {color: '#fff'}]}>Verifikasi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  infoIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    lineHeight: 22,
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
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
    fontSize: 12,
    color: '#666',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    width: 100,
    height: 40,
    overflow: 'hidden',
  },
  weightInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565c0',
    textAlign: 'center',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  waitingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginTop: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  qrInstruction: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tokenInput: {
    backgroundColor: '#f5f5f5',
    width: '100%',
    height: 55,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    letterSpacing: 2,
  },
  modalBtn: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  }
});
