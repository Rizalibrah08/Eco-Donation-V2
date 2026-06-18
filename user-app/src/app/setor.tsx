import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

// Poin per Kg
const RATES = {
  'Botol Plastik': 800,
  'Kertas': 600,
  'Kaleng': 1000,
  'Botol Kaca': 500,
};

export default function SetorScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [categories, setCategories] = useState<{name: string, weight: string}[]>([
    { name: 'Botol Plastik', weight: '' }
  ]);
  const [address, setAddress] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const availableCategories = Object.keys(RATES);

  const addCategory = () => {
    setCategories([...categories, { name: availableCategories[0], weight: '' }]);
  };

  const removeCategory = (index: number) => {
    const newCats = [...categories];
    newCats.splice(index, 1);
    setCategories(newCats);
  };

  const updateCategory = (index: number, field: 'name' | 'weight', value: string) => {
    const newCats = [...categories];
    newCats[index] = { ...newCats[index], [field]: value };
    setCategories(newCats);
  };

  const estimatedPoints = useMemo(() => {
    return categories.reduce((total, cat) => {
      const weight = parseFloat(cat.weight) || 0;
      const rate = RATES[cat.name as keyof typeof RATES] || 0;
      return total + (weight * rate);
    }, 0);
  }, [categories]);

  const handleSubmit = () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Silakan isi alamat penjemputan.');
      return;
    }

    if (!scheduledAt.trim()) {
      Alert.alert('Error', 'Silakan isi jadwal penjemputan.');
      return;
    }

    const items = categories
      .filter(c => parseFloat(c.weight) > 0)
      .map(c => ({ category: c.name, estimated_weight: parseFloat(c.weight) }));

    if (items.length === 0) {
      Alert.alert('Error', 'Silakan masukkan minimal 1 barang dengan berat > 0.');
      return;
    }

    const totalWeight = items.reduce((sum, item) => sum + item.estimated_weight, 0);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    
    const items = categories
      .filter(c => parseFloat(c.weight) > 0)
      .map(c => ({ category: c.name, estimated_weight: parseFloat(c.weight) }));

    setLoading(true);
    try {
      await api.post('/pickups', {
        user_id: user?.id,
        pickup_address: address,
        scheduled_at: scheduledAt,
        items
      });
      
      setSuccessMessage('Permintaan penjemputan berhasil dibuat. Kurir akan segera menuju lokasimu!');
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.error || error.response?.data?.message || 'Terjadi kesalahan server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <LinearGradient colors={['#004d40', '#00bfa5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setor Sampah</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Detail Barang</Text>
        
        {categories.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kategori</Text>
                {/* Simplified dropdown alternative for mobile */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                  {availableCategories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, item.name === cat && styles.chipActive]}
                      onPress={() => updateCategory(index, 'name', cat)}
                    >
                      <Text style={[styles.chipText, item.name === cat && styles.chipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 15 }]}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Estimasi Berat (Kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  value={item.weight}
                  onChangeText={(val) => updateCategory(index, 'weight', val)}
                />
              </View>
              {categories.length > 1 && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeCategory(index)}>
                  <Ionicons name="trash-outline" size={24} color="#ff5252" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
          <Ionicons name="add-circle-outline" size={20} color="#00bfa5" />
          <Text style={styles.addBtnText}>Tambah Kategori</Text>
        </TouchableOpacity>

        <View style={styles.estimationCard}>
          <Text style={styles.estimationLabel}>Estimasi Poin Didapat:</Text>
          <Text style={styles.estimationValue}>+{estimatedPoints.toLocaleString('id-ID')} Poin</Text>
        </View>

        <Text style={styles.sectionTitle}>Informasi Penjemputan</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Alamat Lengkap</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
            placeholder="Contoh: Jl. Sudirman No. 12, Kost Biru Kamar 4"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={[styles.inputGroup, { marginTop: 15 }]}>
          <Text style={styles.label}>Jadwal Penjemputan</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Hari ini 14:00"
            value={scheduledAt}
            onChangeText={setScheduledAt}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Konfirmasi Penjemputan</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Custom Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)/riwayat');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#00bfa5" />
            </View>
            <Text style={styles.modalTitle}>Sukses</Text>
            <Text style={styles.modalMessage}>{successMessage}</Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)/riwayat');
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={showConfirmModal}
        title="Konfirmasi Penjemputan"
        message={`Anda akan menyetorkan ${categories.filter(c => parseFloat(c.weight) > 0).length} jenis barang (Total: ${categories.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0)} Kg).\nEstimasi Poin: +${estimatedPoints.toLocaleString('id-ID')}\n\nLanjutkan?`}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 25,
    marginBottom: 15,
  },
  itemCard: {
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputGroup: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: '#004d40',
  },
  chipText: {
    color: '#666',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  removeBtn: {
    marginLeft: 15,
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#00bfa5',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  addBtnText: {
    color: '#00bfa5',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  estimationCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  estimationLabel: {
    fontSize: 14,
    color: '#2e7d32',
  },
  estimationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginTop: 5,
  },
  submitBtn: {
    backgroundColor: '#00bfa5',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    elevation: 5,
    shadowColor: '#00bfa5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: {
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
