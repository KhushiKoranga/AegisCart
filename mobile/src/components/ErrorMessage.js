import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import Button from './Button';

// Shows an error and, if onRetry is given, a "Try again" button.
export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, backgroundColor: '#FBEAE8', borderRadius: 10 },
  text: { color: colors.danger, fontSize: 14 },
});
