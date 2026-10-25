import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/theme';

// variant: "primary" (filled), "secondary" (outlined) or "danger"
export default function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, style }) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'secondary' ? colors.primary : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, styles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: '600' },
});
