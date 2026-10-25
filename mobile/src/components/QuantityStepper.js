import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export default function QuantityStepper({ quantity, onChange, max = 10 }) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={() => onChange(quantity - 1)} disabled={quantity <= 1}>
        <Text style={styles.symbol}>−</Text>
      </Pressable>
      <Text style={styles.quantity}>{quantity}</Text>
      <Pressable style={styles.button} onPress={() => onChange(quantity + 1)} disabled={quantity >= max}>
        <Text style={styles.symbol}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 18, color: colors.primary },
  quantity: { fontSize: 15, fontWeight: '600', minWidth: 20, textAlign: 'center' },
});
