import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>AegisCart</Text>
      <Text style={styles.tagline}>Try it on before you buy it</Text>
      <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  tagline: { fontSize: 15, color: '#C9D6E8', marginTop: 6 },
  spinner: { marginTop: 32 },
});
