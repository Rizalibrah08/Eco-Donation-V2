import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export default function DashboardScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  const fetchTasks = async () => {
    try {
      // For courier, fetch tasks that are 'waiting' or assigned to them ('on_the_way')
      const response = await api.get(`/pickups/courier/${user?.id}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'waiting':
        return { 
          bg: ['#ff6b6b', '#ee5a6f'] as const, 
          icon: 'alert-circle', 
          text: 'Menunggu', 
          textColor: '#fff' 
        };
      case 'pending_verification':
        return { 
          bg: ['#ffd93d', '#fbbc04'] as const, 
          icon: 'time', 
          text: 'Verifikasi', 
          textColor: '#5d4037' 
        };
      default:
        return { 
          bg: ['#4fc3f7', '#2196f3'] as const, 
          icon: 'bicycle', 
          text: 'On The Way', 
          textColor: '#fff' 
        };
    }
  };

  const renderTask = ({ item }: { item: any }) => {
    const statusConfig = getStatusConfig(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/task/${item.id}`)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#fff' as const, '#f8f9fa' as const]}
          style={styles.cardGradient}
        >
          {/* Header with Order ID and Status */}
          <View style={styles.cardHeader}>
            <View style={styles.orderIdContainer}>
              <Ionicons name="receipt-outline" size={20} color="#1565c0" />
              <Text style={styles.orderId}>#{item.id}</Text>
            </View>
            <LinearGradient
              colors={statusConfig.bg}
              style={styles.statusBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.textColor} />
              <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
                {statusConfig.text}
              </Text>
            </LinearGradient>
          </View>
          
          {/* User Info */}
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={18} color="#4fc3f7" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Pengguna</Text>
              <Text style={styles.infoText}>{item.user_name}</Text>
            </View>
          </View>
          
          {/* Location Info */}
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={18} color="#ff6b6b" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Lokasi Penjemputan</Text>
              <Text style={styles.infoText} numberOfLines={2}>{item.pickup_address}</Text>
            </View>
          </View>

          {/* Footer with action hint */}
          <View style={styles.cardFooter}>
            <Text style={styles.tapHint}>Ketuk untuk detail</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#1565c0', '#0d47a1']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Halo, {user?.name || 'Kurir'}</Text>
            <Text style={styles.headerTitle}>Daftar Tugas Penjemputan</Text>
          </View>
          <TouchableOpacity 
            onPress={handleRefresh}
            style={styles.refreshButton}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="refresh" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total Tugas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {tasks.filter(t => t.status === 'waiting').length}
            </Text>
            <Text style={styles.statLabel}>Menunggu</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {tasks.filter(t => t.status === 'on_the_way').length}
            </Text>
            <Text style={styles.statLabel}>On The Way</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1565c0" />
          <Text style={styles.loadingText}>Memuat tugas...</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>Tidak ada tugas penjemputan</Text>
              <Text style={styles.emptySubtext}>Tugas baru akan muncul di sini</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 14,
    color: '#e3f2fd',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 20,
    paddingTop: 25,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tapHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
