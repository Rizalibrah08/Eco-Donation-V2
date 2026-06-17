import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Campaign {
  id: number;
  title: string;
  category: string;
  target_amount: number;
  collected_amount: number;
  image_url: string;
}

export default function KatalogScreen() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Campaign }) => {
    const progress = Math.min(((item.collected_amount || 0) / (item.target_amount || 1)) * 100, 100);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/campaign/${item.id}`)}
      >
        <Image 
          source={{ uri: item.image_url || 'https://via.placeholder.com/300x150.png?text=Campaign' }} 
          style={styles.image} 
        />
        <View style={styles.cardBody}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressText}>Terkumpul {progress.toFixed(0)}%</Text>
              <Text style={styles.targetText}>dari Rp {(item.target_amount || 0).toLocaleString('id-ID')}</Text>
            </View>
          </View>
          
          <View style={styles.donateButton}>
            <Text style={styles.donateButtonText}>Donasi Sekarang</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#004d40', '#00bfa5']} style={styles.header}>
        <Text style={styles.headerTitle}>Katalog Donasi</Text>
        <Text style={styles.headerSubtitle}>Salurkan kebaikanmu ke tempat yang tepat</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00bfa5" />
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
    paddingBottom: 30,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2f1',
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
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 15,
  },
  categoryBadge: {
    backgroundColor: '#e0f2f1',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    color: '#004d40',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00bfa5',
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: '#00bfa5',
    fontWeight: 'bold',
  },
  targetText: {
    fontSize: 12,
    color: '#666',
  },
  donateButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#00bfa5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  donateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
