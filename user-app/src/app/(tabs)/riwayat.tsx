import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

type TabType = 'proses' | 'selesai';

export default function RiwayatScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('proses');
  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const { user } = useAuthStore();
  const router = useRouter();
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeTab])
  );

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'proses') {
        const res = await api.get(`/pickups?user_id=${user.id}`);
        // Filter only active pickups (waiting, on_the_way)
        setPickups(res.data.filter((p: any) => p.status !== 'completed' && p.status !== 'cancelled'));
      } else {
        const res = await api.get(`/users/${user.id}/transactions`);
        setTransactions(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderProses = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push({ pathname: '/pickup-detail', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'on_the_way' ? '#fff3e0' : item.status === 'pending_verification' ? '#fff8e1' : '#e3f2fd' }]}>
          <Text style={[styles.statusText, { color: item.status === 'on_the_way' ? '#e65100' : item.status === 'pending_verification' ? '#ffb300' : '#1565c0' }]}>
            {item.status === 'on_the_way' ? 'Kurir Menuju Lokasi' : item.status === 'pending_verification' ? 'Menunggu Verifikasi QR' : 'Menunggu Kurir'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color="#666" />
          <Text style={styles.infoText} numberOfLines={2}>{item.pickup_address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.infoText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSelesai = ({ item }: { item: any }) => {
    const isCredit = item.type === 'setor';
    return (
      <TouchableOpacity 
        style={styles.trxCard}
        onPress={() => setSelectedTransaction(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: isCredit ? '#e8f5e9' : '#ffebee' }]}>
          <Ionicons name={isCredit ? 'arrow-down-outline' : 'arrow-up-outline'} size={24} color={isCredit ? '#2e7d32' : '#c62828'} />
        </View>
        <View style={styles.trxContent}>
          <Text style={styles.trxTitle}>{item.title}</Text>
          <Text style={styles.trxDate}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <Text style={[styles.trxPoints, { color: isCredit ? '#2e7d32' : '#c62828' }]}>
          {isCredit ? '+' : ''}{item.points}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#004d40', '#00bfa5']} style={styles.header}>
        <Text style={styles.headerTitle}>Lacak & Riwayat</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'proses' && styles.tabButtonActive]}
            onPress={() => setActiveTab('proses')}
          >
            <Text style={[styles.tabText, activeTab === 'proses' && styles.tabTextActive]}>Dalam Proses</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'selesai' && styles.tabButtonActive]}
            onPress={() => setActiveTab('selesai')}
          >
            <Text style={[styles.tabText, activeTab === 'selesai' && styles.tabTextActive]}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00bfa5" />
        </View>
      ) : activeTab === 'proses' ? (
        <FlatList
          data={pickups}
          renderItem={renderProses}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada penjemputan aktif.</Text>}
        />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderSelesai}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Belum ada riwayat transaksi.</Text>}
        />
      )}

      {/* Transaction Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedTransaction}
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi</Text>
              <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedTransaction && (
              <View style={styles.modalBody}>
                <View style={[styles.modalIconBox, { backgroundColor: selectedTransaction.type === 'setor' ? '#e8f5e9' : '#ffebee' }]}>
                  <Ionicons 
                    name={selectedTransaction.type === 'setor' ? 'arrow-down-outline' : 'arrow-up-outline'} 
                    size={32} 
                    color={selectedTransaction.type === 'setor' ? '#2e7d32' : '#c62828'} 
                  />
                </View>
                
                <Text style={styles.modalTrxTitle}>{selectedTransaction.title}</Text>
                <Text style={styles.modalTrxDate}>{new Date(selectedTransaction.created_at).toLocaleString()}</Text>
                
                <Text style={[styles.modalTrxPoints, { color: selectedTransaction.type === 'setor' ? '#2e7d32' : '#c62828' }]}>
                  {selectedTransaction.type === 'setor' ? '+' : ''}{selectedTransaction.points} Poin
                </Text>
                
                <View style={styles.modalDivider} />
                
                <Text style={styles.modalDescLabel}>Deskripsi</Text>
                <Text style={styles.modalDescText}>{selectedTransaction.description}</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setSelectedTransaction(null)}
            >
              <Text style={styles.modalButtonText}>Tutup</Text>
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
    backgroundColor: '#f9f9f9',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#004d40',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderId: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 10,
    color: '#666',
    flex: 1,
  },
  trxCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  trxContent: {
    flex: 1,
  },
  trxTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  trxDate: {
    fontSize: 12,
    color: '#999',
  },
  trxPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    alignItems: 'center',
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTrxTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalTrxDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  modalTrxPoints: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#eee',
    width: '100%',
    marginBottom: 20,
  },
  modalDescLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  modalDescText: {
    fontSize: 14,
    color: '#666',
    alignSelf: 'flex-start',
    marginBottom: 30,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#00bfa5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
