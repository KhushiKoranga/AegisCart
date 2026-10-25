import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/theme';

export default function TextField({ label, style, ...inputProps }) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput style={[styles.input, style]} placeholderTextColor={colors.muted} autoCapitalize="none" {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text,
  },
});
