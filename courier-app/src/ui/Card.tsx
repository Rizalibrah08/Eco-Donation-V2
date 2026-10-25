import React from 'react';
import { Pressable, StyleSheet, View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from './theme';

interface CardProps extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ onPress, padded = true, elevated = false, style, children, accessibilityLabel, ...rest }: CardProps) {
  const base = [styles.card, padded && styles.padded, elevated ? shadow.md : shadow.sm, style];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View {...rest} style={base}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
