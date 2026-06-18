import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationBannerProps {
  notification: any;
  onDismiss: () => void;
}

export default function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(onDismiss);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const getColors = () => {
    switch (notification.type) {
      case 'order_confirmed':
        return { bg: '#e8f5e9', icon: 'checkmark-circle', color: '#2e7d32' };
      case 'courier_accepted':
        return { bg: '#e3f2fd', icon: 'checkmark-done-outline', color: '#1565c0' };
      case 'courier_near':
        return { bg: '#fff3e0', icon: 'location-outline', color: '#e65100' };
      case 'courier_arrived':
        return { bg: '#fff3e0', icon: 'alert-circle', color: '#e65100' };
      case 'ready_to_scan':
        return { bg: '#f3e5f5', icon: 'qr-code-outline', color: '#6a1b9a' };
      default:
        return { bg: '#f5f5f5', icon: 'information-circle', color: '#666' };
    }
  };

  const { bg, icon, color } = getColors();

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.banner, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={24} color={color} style={styles.icon} />
        <View style={styles.content}>
          <Text style={[styles.title, { color }]}>{notification.title}</Text>
          <Text style={styles.message}>{notification.message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={20} color={color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginHorizontal: 10,
    marginTop: 60,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
