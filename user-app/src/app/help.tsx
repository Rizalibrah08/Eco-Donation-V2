import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const FAQS = [
  {
    question: 'Bagaimana cara menyetor sampah?',
    answer: 'Anda dapat menekan tab "Beranda" lalu pilih "Setor Sampah". Kemudian, pilih kategori sampah dan lokasi penjemputan atau drop-off terdekat yang tersedia.',
  },
  {
    question: 'Apa itu Impact Portfolio?',
    answer: 'Impact Portfolio adalah ringkasan dari kontribusi Anda terhadap lingkungan melalui aplikasi ini, meliputi total kilogram sampah yang disetor, perkiraan emisi CO2 yang berhasil dikurangi, serta donasi yang dihasilkan.',
  },
  {
    question: 'Bagaimana cara menukar poin?',
    answer: 'Poin yang Anda kumpulkan dari menyetor sampah dapat dilihat di profil. Anda dapat menukarnya dengan berbagai hadiah atau voucher yang tersedia di tab "Katalog".',
  },
  {
    question: 'Siapa yang akan mengambil sampah saya?',
    answer: 'Mitra pengumpul atau bank sampah lokal yang telah bekerja sama dengan Eco-Donation akan mengatur jadwal penjemputan sesuai dengan permintaan Anda di aplikasi.',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@ecodonation.com?subject=Bantuan%20Aplikasi');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pusat Bantuan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contactCard}>
          <View style={styles.contactIconContainer}>
            <Ionicons name="headset-outline" size={32} color="#00bfa5" />
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactTitle}>Butuh Bantuan Langsung?</Text>
            <Text style={styles.contactSubtitle}>Tim support kami siap membantu Anda 24/7 untuk segala kendala.</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
          <Text style={styles.contactButtonText}>Hubungi Customer Service</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Pertanyaan Umum (FAQ)</Text>

        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqHeader} 
                  onPress={() => toggleExpand(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionActive]}>
                    {faq.question}
                  </Text>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={isExpanded ? '#00bfa5' : '#888'} 
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
  },
  contactIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#00bfa5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004d40',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#00695c',
    lineHeight: 18,
  },
  contactButton: {
    backgroundColor: '#00bfa5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#00bfa5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  faqList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    paddingRight: 15,
  },
  faqQuestionActive: {
    color: '#00bfa5',
    fontWeight: 'bold',
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
