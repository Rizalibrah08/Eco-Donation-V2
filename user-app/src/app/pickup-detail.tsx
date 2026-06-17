import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function PickupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/pickups/${id}`);
      setOrder(response.data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat detail penjemputan.');
      router.back();
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
      case 'pending_verification': return 'Menunggu Verifikasi QR';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#004d40', '#00bfa5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

        {order.status === 'pending_verification' && (
          <View style={styles.actionCard}>
            <Ionicons name="qr-code" size={40} color="#ffb300" style={styles.actionIcon} />
            <Text style={styles.actionTitle}>Menunggu Verifikasi</Text>
            <Text style={styles.actionDesc}>
              Kurir telah menimbang barang Anda. Silakan verifikasi berat aktual melalui scan QR Code dari HP kurir.
            </Text>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={() => router.push('/scan')}
            >
              <Ionicons name="scan" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.scanButtonText}>Scan QR Sekarang</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  actionIcon: {
    marginBottom: 10,
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
  scanButton: {
    flexDirection: 'row',
    backgroundColor: '#00bfa5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
