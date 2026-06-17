import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import ConfirmModal from '../../components/ConfirmModal';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

// Donut chart colors per category
const DONUT_COLORS: Record<string, string> = {
  'Botol Plastik': '#00bfa5',
  'Kertas': '#ffb300',
  'Kaleng': '#555',
  'Botol Kaca': '#1565c0',
};

// Badge definitions
const BADGE_DEFS = [
  { key: 'eco_warrior', name: 'Eco Warrior', icon: 'leaf-outline' as const, color: '#00bfa5', bg: '#e0f2f1' },
  { key: 'recycling_hero', name: 'Recycling Hero', icon: 'refresh-outline' as const, color: '#1565c0', bg: '#e3f2fd' },
  { key: 'kind_heart', name: 'Kind Heart', icon: 'heart' as const, color: '#e91e63', bg: '#fce4ec' },
  { key: 'top_donor', name: 'Top Donor', icon: 'trophy-outline' as const, color: '#9e9e9e', bg: '#f5f5f5' },
];

const TIER_COLORS: Record<string, string> = {
  gold: '#ffb300',
  silver: '#9e9e9e',
  bronze: '#cd7f32',
};

export default function ProfilScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      try {
        const [profileRes, lbRes, distRes] = await Promise.all([
          api.get(`/users/${user.id}`),
          api.get(`/users/${user.id}/leaderboard`),
          api.get(`/users/${user.id}/distribution`),
        ]);
        setProfileData(profileRes.data);
        setLeaderboard(lbRes.data);
        setDistribution(distRes.data);
      } catch (error) {
        console.error('Failed to fetch profile data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.replace('/(auth)/login');
  };

  if (loading || !profileData) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00bfa5" />
      </View>
    );
  }

  // Calculate user rank
  const userRank = leaderboard.findIndex(u => u.id === user?.id) + 1 || '-';

  // Distribution chart data
  const totalWeight = distribution.reduce((sum, d) => sum + (d.total_weight || 0), 0);
  const distWithPercent = distribution.map(d => ({
    ...d,
    percent: totalWeight > 0 ? Math.round((d.total_weight / totalWeight) * 100) : 0,
    color: DONUT_COLORS[d.category] || '#ccc',
  }));

  // Rank icon
  const getRankIcon = (rank: number) => {
    if (rank === 1) return { name: 'trophy' as const, color: '#ffb300' };
    if (rank === 2) return { name: 'trophy' as const, color: '#9e9e9e' };
    if (rank === 3) return { name: 'trophy' as const, color: '#cd7f32' };
    return null;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#004d40', '#00bfa5']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerName}>{profileData.name}</Text>
            <Text style={styles.headerEmail}>{profileData.email}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profileData.total_setor_count || 0}</Text>
            <Text style={styles.statLabel}>Total Setor</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profileData.total_donasi_count || 0}</Text>
            <Text style={styles.statLabel}>Donasi</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>#{userRank}</Text>
            <Text style={styles.statLabel}>Peringkat</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Impact Portfolio */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="ribbon-outline" size={20} color="#00bfa5" />
            <Text style={styles.cardTitle}>Impact Portfolio</Text>
          </View>
          <View style={styles.impactRow}>
            <View style={styles.impactItem}>
              <View style={[styles.impactIcon, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="people-outline" size={22} color="#2e7d32" />
              </View>
              <Text style={styles.impactValue}>{(profileData.total_kg || 0).toFixed(1)}</Text>
              <Text style={styles.impactLabel}>Kg Sampah</Text>
            </View>
            <View style={styles.impactItem}>
              <View style={[styles.impactIcon, { backgroundColor: '#e0f2f1' }]}>
                <Ionicons name="leaf-outline" size={22} color="#00695c" />
              </View>
              <Text style={styles.impactValue}>{(profileData.total_co2 || 0).toFixed(1)}</Text>
              <Text style={styles.impactLabel}>Kg CO₂</Text>
            </View>
            <View style={styles.impactItem}>
              <View style={[styles.impactIcon, { backgroundColor: '#fce4ec' }]}>
                <Ionicons name="heart" size={22} color="#c2185b" />
              </View>
              <Text style={styles.impactValue}>Rp{((profileData.total_donations_rp || 0) / 1000).toFixed(0)}K</Text>
              <Text style={styles.impactLabel}>Donasi</Text>
            </View>
          </View>
        </View>

        {/* Distribusi Sampah */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Distribusi Sampah</Text>
          {totalWeight > 0 ? (
            <>
              <View style={styles.donutContainer}>
                <View style={styles.donutRing}>
                  {/* Simple visual donut using border segments */}
                  <View style={styles.donutCenter}>
                    <Text style={styles.donutTotal}>{totalWeight.toFixed(1)}</Text>
                    <Text style={styles.donutUnit}>Kg</Text>
                  </View>
                </View>
              </View>
              <View style={styles.legendContainer}>
                {distWithPercent.map((d, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                    <Text style={styles.legendText}>{d.category} ({d.percent}%)</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Belum ada data setoran.</Text>
          )}
        </View>

        {/* Lencana & Pencapaian */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="ribbon" size={20} color="#ffb300" />
            <Text style={styles.cardTitle}>Lencana & Pencapaian</Text>
          </View>
          <View style={styles.badgesRow}>
            {BADGE_DEFS.map((def) => {
              const earned = profileData.badges?.find((b: any) => b.name === def.name);
              return (
                <View key={def.key} style={styles.badgeItem}>
                  <View style={[styles.badgeCircle, { backgroundColor: earned ? def.bg : '#f5f5f5' }]}>
                    <Ionicons 
                      name={def.icon} 
                      size={28} 
                      color={earned ? def.color : '#ccc'} 
                    />
                  </View>
                  <Text style={[styles.badgeName, !earned && { color: '#ccc' }]}>{def.name}</Text>
                  {earned && (
                    <Text style={[styles.badgeTier, { color: TIER_COLORS[earned.tier] || '#999' }]}>
                      {earned.tier.charAt(0).toUpperCase() + earned.tier.slice(1)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Papan Peringkat Komunitas */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="star-outline" size={20} color="#ffb300" />
            <Text style={styles.cardTitle}>Papan Peringkat Komunitas</Text>
          </View>
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isMe = entry.id === user?.id;
            const rankIcon = getRankIcon(rank);

            return (
              <View 
                key={entry.id} 
                style={[styles.lbRow, isMe && styles.lbRowMe]}
              >
                <View style={styles.lbRankContainer}>
                  {rankIcon ? (
                    <Ionicons name={rankIcon.name} size={20} color={rankIcon.color} />
                  ) : (
                    <Text style={styles.lbRankNum}>{rank}</Text>
                  )}
                </View>
                <Text style={[styles.lbName, isMe && styles.lbNameMe]}>
                  {entry.name}{isMe ? ' (Kamu)' : ''}
                </Text>
                <Text style={styles.lbPoints}>
                  {(entry.points || 0).toLocaleString('id-ID')} poin
                </Text>
              </View>
            );
          })}
          {leaderboard.length === 0 && (
            <Text style={styles.emptyText}>Belum ada data peringkat.</Text>
          )}
        </View>

        {/* Menu Footer */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={20} color="#666" />
            <Text style={styles.menuText}>Pengaturan Akun</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.menuText}>Pusat Bantuan</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ff5252" />
            <Text style={[styles.menuText, { color: '#ff5252' }]}>Keluar</Text>
            <Ionicons name="chevron-forward" size={20} color="#ff5252" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </View>

      <ConfirmModal
        visible={showLogoutModal}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun ini?"
        confirmText="Keluar"
        isDestructive={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </ScrollView>
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
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 25,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  headerName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerEmail: {
    fontSize: 14,
    color: '#b2dfdb',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#b2dfdb',
  },
  // Content
  content: {
    padding: 16,
    marginTop: -10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 18,
  },
  // Impact Portfolio
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactItem: {
    alignItems: 'center',
    flex: 1,
  },
  impactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  impactLabel: {
    fontSize: 12,
    color: '#888',
  },
  // Donut Chart
  donutContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  donutRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 20,
    borderColor: '#00bfa5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenter: {
    alignItems: 'center',
  },
  donutTotal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  donutUnit: {
    fontSize: 12,
    color: '#888',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#555',
  },
  // Badges
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeItem: {
    alignItems: 'center',
    width: '23%',
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeTier: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Leaderboard
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  lbRowMe: {
    backgroundColor: '#e0f7f4',
    borderRadius: 12,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: '#b2dfdb',
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  lbRankContainer: {
    width: 30,
    alignItems: 'center',
  },
  lbRankNum: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#888',
  },
  lbName: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  lbNameMe: {
    color: '#00695c',
    fontWeight: 'bold',
  },
  lbPoints: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  // Menu
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 15,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
});
