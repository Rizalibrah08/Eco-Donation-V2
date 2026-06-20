import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { getSocket } from '../services/socketService';
import QRCodeDisplay from '../components/QRCodeDisplay';

export default function PickupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [qrData, setQrData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchDetail();

    const socket = getSocket();
    if (socket) {
      socket.on('qr_ready', (data: any) => {
        if (data.orderId === parseInt(id as string)) {
          setQrData({
            token: JSON.stringify({ order_id: data.orderId, token: data.token, items: data.items }),
            shortToken: data.shortToken
          });
          setShowApprovalModal(true);
          fetchDetail();
        }
      });

      socket.on('verification_completed', (data: any) => {
        if (data.orderId === parseInt(id as string)) {
          setShowApprovalModal(false);
          fetchDetail();
        }
      });
    }

    return () => {
      socket?.off('qr_ready');
      socket?.off('verification_completed');
    };
  }, [id]);

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/pickups/${id}`);
      setOrder(response.data);
      if (response.data.status === 'pending_verification') {
        const qrRes = await api.get(`/pickups/${id}/qr`).catch(() => null);
        if (qrRes?.data) {
          setQrData({
            token: qrRes.data.qr_payload,
            shortToken: qrRes.data.short_token
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat detail penjemputan.');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00bfa5" />
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#1565c0';
      case 'on_the_way': return '#e65100';
      case 'pending_verification': return '#ffb300';
      case 'completed': return '#2e7d32';
      case 'cancelled': return '#c62828';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Menunggu Kurir';
      case 'on_the_way': return 'Kurir Menuju Lokasi';
      case 'pending_verification': return 'Verifikasi QR';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.headerTitle}>Detail Penjemputan</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Dibuat: {new Date(order.created_at).toLocaleString()}</Text>
          </View>

          {order.completed_at && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#2e7d32" />
              <Text style={styles.infoText}>Selesai: {new Date(order.completed_at).toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Alamat Penjemputan</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location" size={24} color="#00bfa5" style={styles.addressIcon} />
            <Text style={styles.addressText}>{order.pickup_address}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Detail Barang</Text>
          {order.items?.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemIconBox}>
                <Ionicons name="cube-outline" size={20} color="#004d40" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <Text style={styles.itemWeight}>
                  Estimasi: {item.estimated_weight} Kg
                  {item.actual_weight ? ` • Aktual: ${item.actual_weight} Kg` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {order.status === 'pending_verification' && qrData && (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Tunjukkan ke Kurir</Text>
            <Text style={styles.actionDesc}>
              Biarkan kurir men-scan QR Code di bawah ini atau sebutkan Token untuk menyelesaikan proses dan mencairkan poin.
            </Text>

            <View style={styles.qrCodeBox}>
              <QRCodeDisplay value={qrData.token} size={200} />
            </View>

            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>TOKEN</Text>
              <Text style={styles.tokenText}>{qrData.shortToken}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showApprovalModal}
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ marginBottom: 15 }}>
              <Ionicons name="checkmark-circle" size={60} color="#00bfa5" />
            </View>
            <Text style={styles.modalTitle}>Verifikasi Penjemputan</Text>
            <Text style={styles.modalMessage}>
              Kurir telah selesai menimbang sampah Anda. Lanjutkan untuk menampilkan kode verifikasi.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowApprovalModal(false)}
            >
              <Text style={styles.modalButtonText}>Tampilkan Kode Verifikasi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  addressBox: {
    flexDirection: 'row',
    backgroundColor: '#e0f2f1',
    padding: 15,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    color: '#004d40',
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2f1',
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
    marginBottom: 2,
  },
  itemWeight: {
    fontSize: 13,
    color: '#666',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  actionDesc: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  qrCodeBox: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    marginBottom: 20,
  },
  tokenBox: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00bfa5',
    letterSpacing: 4,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#00bfa5',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
