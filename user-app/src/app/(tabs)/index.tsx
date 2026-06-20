import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, updateUserPoints } = useAuthStore();
  const [activePickup, setActivePickup] = React.useState<any>(null);
  const [hasUnreadNotif, setHasUnreadNotif] = React.useState(false);

  // Fetch updated user data (points) when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          if (user) {
            const response = await api.get(`/users/${user.id}`);
            if (response.data?.points !== undefined) {
              updateUserPoints(response.data.points);
            }
            
            // Fetch active pickup
            const pickupsResponse = await api.get(`/pickups?user_id=${user.id}`);
            const active = pickupsResponse.data.find((p: any) => p.status === 'on_the_way' || p.status === 'pending_verification');
            setActivePickup(active);
          }
        } catch (error) {
          console.error('Failed to fetch user points', error);
        }
      };
      fetchUserData();
    }, [user?.id])
  );

  const quickActions = [
    { id: 'setor', title: 'Setor Sampah', icon: 'leaf-outline', color: '#00bfa5', route: '/setor' },
    { id: 'donasi', title: 'Salurkan Donasi', icon: 'heart-outline', color: '#ff5252', route: '/(tabs)/katalog' },
    { id: 'riwayat', title: 'Riwayat Transaksi', icon: 'time-outline', color: '#448aff', route: '/(tabs)/riwayat' },
    { id: 'peringkat', title: 'Papan Peringkat', icon: 'trophy-outline', color: '#ffb300', route: '/(tabs)/profil' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#004d40', '#00bfa5']}
        style={styles.headerBackground}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, {user?.name?.split(' ')[0] || 'User'}!</Text>
            <Text style={styles.subGreeting}>Mari hijaukan bumi hari ini 🌍</Text>
          </View>
          <TouchableOpacity 
            style={styles.notifButton}
            onPress={() => {
              setHasUnreadNotif(false);
              Alert.alert('Notifikasi', 'Tidak ada notifikasi baru.');
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {hasUnreadNotif && <View style={styles.notifBadge} />}
          </TouchableOpacity>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>Saldo Poin Donasi</Text>
          <View style={styles.pointsContainer}>
            <Ionicons name="star" size={28} color="#ffb300" />
            <Text style={styles.pointsText}>{user?.points?.toLocaleString('id-ID') || '0'}</Text>
          </View>
          <Text style={styles.rupiahText}>≈ Rp {(user?.points || 0).toLocaleString('id-ID')}</Text>
        </View>

        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity 
              key={action.id} 
              style={styles.actionItem}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activePickup && (
          <TouchableOpacity 
            style={styles.bannerContainer}
            onPress={() => router.push({ pathname: '/pickup-detail', params: { id: activePickup.id } })}
          >
            <LinearGradient
              colors={['#fff3e0', '#ffe0b2']}
              style={styles.banner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.bannerTextContainer}>
                <Text style={[styles.bannerTitle, { color: '#e65100' }]}>Ada Penjemputan Aktif!</Text>
                <Text style={[styles.bannerDesc, { color: '#ef6c00' }]}>
                  {activePickup.status === 'on_the_way' ? 'Kurir sedang menuju ke lokasimu.' : 'Kurir menunggu verifikasi QR darimu.'}
                </Text>
              </View>
              <Ionicons name="bicycle" size={40} color="#e65100" style={styles.bannerIcon} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#e0f2f1', '#b2dfdb']}
            style={styles.banner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Tantangan Bulan Ini!</Text>
              <Text style={styles.bannerDesc}>Setor 10kg botol plastik, dapatkan badge eksklusif.</Text>
            </View>
            <Ionicons name="medal" size={40} color="#004d40" style={styles.bannerIcon} />
          </LinearGradient>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: '#e0f2f1',
  },
  notifButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff5252',
  },
  mainCard: {
    backgroundColor: '#fff',
    marginHorizontal: 25,
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  pointsText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  rupiahText: {
    fontSize: 16,
    color: '#00bfa5',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 25,
    marginTop: 30,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
  },
  actionItem: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  bannerContainer: {
    paddingHorizontal: 25,
    marginTop: 15,
  },
  banner: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004d40',
    marginBottom: 5,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#00695c',
    lineHeight: 18,
  },
  bannerIcon: {
    marginLeft: 15,
  },
});
