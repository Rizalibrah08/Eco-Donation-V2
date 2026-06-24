import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import ConfirmModal from '../../components/ConfirmModal';
import WarningModal from '../../components/WarningModal';
import ErrorModal from '../../components/ErrorModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { globalGivingService, ExternalCampaign } from '../../services/globalGivingService';
import { useAuthStore } from '../../store/useAuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, updateUserPoints } = useAuthStore();

  const [campaign, setCampaign] = useState<ExternalCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [donatedAmount, setDonatedAmount] = useState(0);
  const [communityPoints, setCommunityPoints] = useState(0); // Poin dari DB lokal

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/katalog');
    }
  };

  useEffect(() => {
    if (id) {
      fetchCampaignDetail();
      fetchCommunityPoints();
    }
  }, [id]);

  const fetchCommunityPoints = async () => {
    try {
      // Untuk kebutuhan prototipe, simpan poin komunitas lokal di AsyncStorage
      // Di produksi, fetch dari: await api.get(`/donations/campaign/${id}/total`)
      const savedPoints = await AsyncStorage.getItem(`@community_points_${id}`);
      if (savedPoints !== null) {
        setCommunityPoints(parseInt(savedPoints, 10));
      } else {
        setCommunityPoints(0);
      }
    } catch (error) {
      setCommunityPoints(0);
    }
  };

  const fetchCampaignDetail = async () => {
    try {
      const data = await globalGivingService.fetchCampaignById(id as string);
      if (data) {
        setCampaign(data);
      } else {
        throw new Error('Not found');
      }
    } catch (error) {
      setErrorMessage('Gagal memuat detail kampanye.');
      setShowError(true);
      handleGoBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    const amount = parseInt(donateAmount.replace(/\D/g, ''), 10);

    if (!amount || amount <= 0) {
      setWarningMessage('Masukkan nominal donasi yang valid.');
      setShowWarning(true);
      return;
    }

    if (user && user.points < amount) {
      setWarningMessage(`Saldo Anda: ${user.points} Poin. Anda membutuhkan ${amount - user.points} Poin lagi.`);
      setShowWarning(true);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleMaxPoints = () => {
    if (user && user.points) {
      setDonateAmount(user.points.toString());
    }
  };

  const handleConfirmDonate = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    const amount = parseInt(donateAmount.replace(/\D/g, ''), 10);

    try {
      await api.post('/donations', {
        user_id: user?.id,
        campaign_id: id as string, // Simpan ID campaign eksternal
        points: amount
      });

      if (user) {
        updateUserPoints(user.points - amount);
      }

      setDonatedAmount(amount);
      const newCommunityPoints = communityPoints + amount;
      setCommunityPoints(newCommunityPoints);
      await AsyncStorage.setItem(`@community_points_${id}`, newCommunityPoints.toString());
      setShowSuccessModal(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || error.response?.data?.message || 'Terjadi kesalahan');
      setShowError(true);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: campaign.image_url || 'https://via.placeholder.com/400x250.png?text=Campaign' }}
            style={styles.image}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={styles.imageOverlay}
          >
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
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
                <Text style={styles.progressText}>{progress.toFixed(0)}% Pendanaan Global</Text>
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

            <View style={styles.localStatsContainer}>
              <View style={styles.localStatsHeader}>
                <Ionicons name="leaf" size={16} color="#00bfa5" />
                <Text style={styles.localStatsTitle}>Kontribusi Komunitas Eco-Donation</Text>
              </View>
              <Text style={styles.localStatsValue}>{communityPoints.toLocaleString('id-ID')} Poin Tersalurkan</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.description}>{campaign.description}</Text>

          <View style={styles.donationSection}>
            <Text style={styles.sectionTitle}>Masukkan Nominal Donasi</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="leaf" size={20} color="#00bfa5" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0"
                value={donateAmount}
                onChangeText={setDonateAmount}
              />
              <TouchableOpacity style={styles.maxButton} onPress={handleMaxPoints}>
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
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

      {/* Custom Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => {
          setShowSuccessModal(false);
          handleGoBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#00bfa5" />
            </View>
            <Text style={styles.modalTitle}>Donasi Berhasil!</Text>
            <Text style={styles.modalMessage}>
              Terima kasih telah berdonasi sebesar {donatedAmount.toLocaleString('id-ID')} Poin.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                handleGoBack();
              }}
            >
              <Text style={styles.modalButtonText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={showConfirmModal}
        title="Konfirmasi Donasi"
        message={`Anda akan mendonasikan ${(parseInt(donateAmount.replace(/\D/g, ''), 10) || 0).toLocaleString('id-ID')} Poin ke kampanye "${campaign.title}".\n\nLanjutkan?`}
        onConfirm={handleConfirmDonate}
        onCancel={() => setShowConfirmModal(false)}
      />

      <WarningModal
        visible={showWarning}
        title="Perhatian"
        message={warningMessage}
        onConfirm={() => setShowWarning(false)}
      />

      <ErrorModal
        visible={showError}
        title="Donasi Gagal"
        message={errorMessage}
        onConfirm={() => setShowError(false)}
      />
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
  localStatsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  localStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  localStatsTitle: {
    fontSize: 12,
    color: '#00bfa5',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  localStatsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    flexShrink: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  maxButton: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
    flexShrink: 0,
  },
  maxButtonText: {
    color: '#00695c',
    fontWeight: 'bold',
    fontSize: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successIconContainer: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#00bfa5',
    paddingVertical: 12,
    paddingHorizontal: 30,
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
