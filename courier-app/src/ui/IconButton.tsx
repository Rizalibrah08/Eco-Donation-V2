import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from './theme';
import { Text } from './Text';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: 'surface' | 'glass' | 'plain';
  size?: number;
  color?: string;
  badge?: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  variant = 'surface',
  size = 40,
  color,
  badge,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const bg = variant === 'surface' ? colors.surface : variant === 'glass' ? 'rgba(255,255,255,0.18)' : 'transparent';
  const fg = color || (variant === 'glass' ? '#FFFFFF' : colors.text);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
        variant === 'surface' && styles.border,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={fg} />
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text variant="caption" weight="700" style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  border: { borderWidth: 1, borderColor: colors.border },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
});
