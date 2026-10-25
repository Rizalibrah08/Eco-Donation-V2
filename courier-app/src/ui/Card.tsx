import React from 'react';
import { Pressable, StyleSheet, View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing } from './theme';

interface CardProps extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
  /** Dipertahankan agar pemanggil lama tetap valid; kartu tidak lagi memakai bayangan. */
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ onPress, padded = true, elevated: _elevated, style, children, accessibilityLabel, ...rest }: CardProps) {
  const base = [styles.card, padded && styles.padded, style];
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
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
});
