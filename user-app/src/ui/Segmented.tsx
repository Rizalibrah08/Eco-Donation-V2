import React from 'react';
import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing } from './theme';
import { Text } from './Text';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.item, active && styles.active]}
          >
            <Text variant="bodySmall" weight="500" tone={active ? 'default' : 'muted'}>
              {opt.label}
            </Text>
            {opt.count !== undefined && opt.count > 0 && (
              <View style={[styles.count, active && styles.countActive]}>
                <Text variant="caption" weight="600" style={{ color: active ? colors.onPrimary : colors.text, fontSize: 11 }}>
                  {opt.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.surface },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countActive: { backgroundColor: colors.primary },
});
