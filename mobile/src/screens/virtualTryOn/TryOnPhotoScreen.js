import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, commonStyles } from '../../constants/theme';
import { useTryOn } from '../../context/TryOnContext';
import { uploadPhoto } from '../../services/tryOnService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';

export default function TryOnPhotoScreen({ navigation, route }) {
  const { productId, variantId } = route.params || {};
  const { photo, setPhoto } = useTryOn();
  const [pendingUri, setPendingUri] = useState(null); // chosen but not uploaded yet
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Permissions are requested only when the customer taps a button.
  async function chooseFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError('Please allow photo access in your phone settings to choose a photo.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) { setPendingUri(result.assets[0].uri); setError(''); }
    return null;
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setError('Please allow camera access in your phone settings to take a photo.');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) { setPendingUri(result.assets[0].uri); setError(''); }
    return null;
  }

  // Go on to the outfit: a specific product if we came from a product page, otherwise the outfit list.
  function continueToOutfit() {
    if (productId) navigation.replace('TryOnProcessing', { productId, variantId });
    else navigation.replace('TryOnOutfitPicker');
  }

  async function handleContinue() {
    if (!pendingUri) return continueToOutfit();
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadPhoto(pendingUri);
      setPhoto({ id: uploaded.id, localUri: pendingUri });
      continueToOutfit();
    } catch (uploadError) {
      setError(uploadError.message);
      setUploading(false);
    }
    return null;
  }

  const shownUri = pendingUri || (photo && photo.localUri);

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      {shownUri ? <Image source={{ uri: shownUri }} style={styles.preview} /> : (
        <View style={[styles.preview, styles.emptyPreview]}><Text style={commonStyles.mutedText}>No photo chosen yet</Text></View>
      )}

      <View style={commonStyles.row}>
        <Button title="Gallery" variant="secondary" style={styles.flex} onPress={chooseFromGallery} />
        <Button title="Camera" variant="secondary" style={styles.flex} onPress={takePhoto} />
      </View>

      <View style={commonStyles.card}>
        <Text style={commonStyles.subtitle}>For the best result</Text>
        <Text style={commonStyles.bodyText}>• Stand straight and face the camera.</Text>
        <Text style={commonStyles.bodyText}>• Show your full body or at least your upper body.</Text>
        <Text style={commonStyles.bodyText}>• Use good light and a plain background.</Text>
        <Text style={commonStyles.bodyText}>• Wear fitted clothes and keep your arms away from your body.</Text>
      </View>

      {pendingUri ? (
        <Pressable style={commonStyles.card} onPress={() => setConsent(!consent)}>
          <Text style={commonStyles.bodyText}>{consent ? '☑' : '☐'} I agree that my photo is sent to an AI service to create try-on previews.</Text>
          <Text style={commonStyles.mutedText}>
            Your photo is stored privately, visible only to you, and deleted automatically after 24 hours. You can delete previews any time.
          </Text>
        </Pressable>
      ) : null}

      <ErrorMessage message={error} />
      <Button title={pendingUri ? 'Upload and continue' : 'Continue with this photo'} onPress={handleContinue}
        disabled={!shownUri || (Boolean(pendingUri) && !consent)} loading={uploading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14, backgroundColor: colors.border },
  emptyPreview: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
