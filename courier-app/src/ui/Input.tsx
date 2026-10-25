import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from './theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, hint, error, icon, right, secureTextEntry, containerStyle, editable = true, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={containerStyle}>
      {label && (
        <Text variant="bodySmall" weight="600" style={styles.label}>
          {label}
        </Text>
      )}
      <View style={[styles.field, { borderColor }, !editable && styles.disabled, focused && styles.focused]}>
        {icon && <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textSubtle} />}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={hidden}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, style]}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSubtle} />
          </Pressable>
        )}
        {right}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" style={styles.helper}>{error}</Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle" style={styles.helper}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs + 2, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md + 2,
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  focused: { backgroundColor: '#FFFFFF' },
  disabled: { backgroundColor: colors.surfaceAlt },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.md },
  helper: { marginTop: spacing.xs },
});
