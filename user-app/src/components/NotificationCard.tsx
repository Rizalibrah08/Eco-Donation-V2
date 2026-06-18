import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationCardProps {
  notification: any;
}

export default function NotificationCard({ notification }: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'order_confirmed':
        return { name: 'checkmark-circle', color: '#2e7d32' };
      case 'courier_accepted':
        return { name: 'checkmark-done-outline', color: '#1565c0' };
      case 'courier_near':
        return { name: 'location-outline', color: '#e65100' };
      case 'courier_arrived':
        return { name: 'alert-circle', color: '#e65100' };
      case 'ready_to_scan':
        return { name: 'qr-code-outline', color: '#6a1b9a' };
      default:
        return { name: 'information-circle', color: '#666' };
    }
  };

  const { name, color } = getIcon();

  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={name as any} size={24} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(notification.timestamp).toLocaleString('id-ID')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
});
