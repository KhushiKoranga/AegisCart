import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL, colors } from '../constants/theme';
import { getAccessToken } from '../services/apiClient';

// Shows an image that is stored privately on the server (for example a try-on result).
// The image is downloaded with the login token, so only its owner can see it.
export default function PrivateImage({ path, style }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: `${API_BASE_URL}${path}`, headers: { Authorization: `Bearer ${getAccessToken()}` } }}
      style={[styles.image, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  placeholder: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.muted },
});
