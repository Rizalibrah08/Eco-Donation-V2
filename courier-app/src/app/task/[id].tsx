import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import ConfirmModal from '../../components/ConfirmModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // State for actual weights input
  const [actualWeights, setActualWeights] = useState<Record<string, string>>({});
  const [qrToken, setQrToken] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskDetail();
  }, [id]);

  const fetchTaskDetail = async () => {
    try {
      const response = await api.get(`/pickups/${id}`);
      setTask(response.data);
      
      if (response.data.status === 'pending_verification') {
        const qrResponse = await api.get(`/pickups/${id}/qr`);
        setQrToken(qrResponse.data.qr_payload);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat tugas.');
      router.back();
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

  const handleGenerateQR = async () => {
    // Validate inputs
    const items = task.items.map((item: any) => ({
      id: item.id,
      actual_weight: parseFloat(actualWeights[item.id] || '0')
    }));

    const invalid = items.some((i: any) => isNaN(i.actual_weight) || i.actual_weight <= 0);
    if (invalid) {
      Alert.alert('Input Tidak Valid', 'Silakan masukkan berat aktual (Kg) untuk semua barang.');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post(`/pickups/${id}/weigh`, { items });
      setQrToken(response.data.qr_payload);
      Alert.alert('Sukses', 'QR Code berhasil di-generate. Silakan minta User untuk memindai QR Code ini.');
    } catch (error) {
      Alert.alert('Gagal', 'Tidak dapat memproses berat aktual.');
    } finally {
      setProcessing(false);
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Tugas #{task.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {qrToken ? (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>Tunjukkan QR ini ke Pengguna</Text>
            <View style={styles.qrCodeBox}>
              <QRCodeDisplay
                value={qrToken}
                size={220}
                color="black"
                backgroundColor="white"
              />
            </View>
            <Text style={styles.qrInstruction}>
              Pengguna perlu melakukan scan melalui User App untuk memverifikasi berat dan mencairkan Poin.
            </Text>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#1565c0', width: '100%', marginTop: 20 }]} 
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.actionButtonText}>Kembali ke Daftar Tugas</Text>
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
                     task.status === 'pending_verification' ? 'Menunggu User Scan QR' : 'Kurir Menuju Lokasi'}
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
              onPress={handleGenerateQR}
              disabled={processing}
            >
              {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Generate QR Verifikasi</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <ConfirmModal
        visible={showConfirmModal}
        title="Konfirmasi"
        message="Apakah Anda yakin ingin menerima tugas ini?"
        confirmText="Terima Tugas"
        onConfirm={handleConfirmAccept}
        onCancel={() => setShowConfirmModal(false)}
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  },
  weightInput: {
    flex: 1,
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
    marginBottom: 30,
  },
  qrCodeBox: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  qrInstruction: {
    marginTop: 30,
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
});
