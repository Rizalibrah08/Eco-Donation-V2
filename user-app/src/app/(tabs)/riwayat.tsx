import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

type TabType = 'proses' | 'selesai';

export default function RiwayatScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('proses');
  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'on_the_way' ? '#fff3e0' : '#e3f2fd' }]}>
          <Text style={[styles.statusText, { color: item.status === 'on_the_way' ? '#e65100' : '#1565c0' }]}>
            {item.status === 'on_the_way' ? 'Kurir Menuju Lokasi' : 'Menunggu Kurir'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color="#666" />
          <Text style={styles.infoText} numberOfLines={2}>{item.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.infoText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  const renderSelesai = ({ item }: { item: any }) => {
    const isCredit = item.type === 'setor';
    return (
      <View style={styles.trxCard}>
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
      </View>
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
});
