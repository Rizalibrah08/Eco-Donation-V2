import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, updateUserPoints } = useAuthStore();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchCampaignDetail();
  }, [id]);

  const fetchCampaignDetail = async () => {
    try {
      const response = await api.get(`/campaigns/${id}`);
      setCampaign(response.data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat detail kampanye.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    const amount = parseInt(donateAmount.replace(/\D/g, ''), 10);
    
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Masukkan nominal donasi yang valid.');
      return;
    }

    if (user && user.points < amount) {
      Alert.alert('Saldo Tidak Cukup', `Saldo Anda: ${user.points} Poin. Anda membutuhkan ${amount - user.points} Poin lagi.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/donations', {
        user_id: user?.id,
        campaign_id: parseInt(id as string, 10),
        points: amount
      });
      
      // Update local state points
      if (user) {
        updateUserPoints(user.points - amount);
      }

      Alert.alert('Donasi Berhasil!', `Terima kasih telah berdonasi sebesar Rp ${amount.toLocaleString('id-ID')}.`, [
        { text: 'Selesai', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Donasi Gagal', error.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !campaign) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00bfa5" />
      </View>
    );
  }

  const progress = Math.min(((campaign.collected_amount || 0) / (campaign.target_amount || 1)) * 100, 100);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: campaign.image_url || 'https://via.placeholder.com/400x250.png?text=Campaign' }} 
            style={styles.image} 
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={styles.imageOverlay}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{campaign.category || 'Umum'}</Text>
          </View>
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.organizer}>Oleh: {campaign.organizer || '-'}</Text>

          <View style={styles.statsCard}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.progressTextContainer}>
                <Text style={styles.progressText}>{progress.toFixed(0)}% Terkumpul</Text>
              </View>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Terkumpul</Text>
                <Text style={styles.statValue}>Rp {(campaign.collected_amount || 0).toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Target</Text>
                <Text style={styles.statValue}>Rp {(campaign.target_amount || 0).toLocaleString('id-ID')}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.description}>{campaign.description}</Text>

          <View style={styles.donationSection}>
            <Text style={styles.sectionTitle}>Masukkan Nominal Donasi</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0"
                value={donateAmount}
                onChangeText={setDonateAmount}
              />
            </View>
            <Text style={styles.balanceInfo}>Saldo Anda: {user?.points?.toLocaleString('id-ID') || 0} Poin</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.donateButton} 
          onPress={handleDonate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.donateButtonText}>Donasi Sekarang</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: '#fff',
    marginTop: -25,
  },
  categoryBadge: {
    backgroundColor: '#e0f2f1',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryText: {
    color: '#004d40',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  organizer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00bfa5',
  },
  progressTextContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 14,
    color: '#00bfa5',
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
    marginHorizontal: 15,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    marginBottom: 30,
  },
  donationSection: {
    backgroundColor: '#f0fdfa',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00bfa5',
    paddingHorizontal: 15,
    height: 55,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceInfo: {
    marginTop: 10,
    fontSize: 13,
    color: '#00695c',
    textAlign: 'right',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  donateButton: {
    backgroundColor: '#00bfa5',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#00bfa5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
