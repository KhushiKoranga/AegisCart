import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTryOn } from '../../context/TryOnContext';
import { createTryOn, getTryOn } from '../../services/tryOnService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

const POLL_INTERVAL_MS = 3000;

// Starts the AI job, then asks the server for the status every few seconds.
export default function TryOnProcessingScreen({ navigation, route }) {
  const { productId, variantId } = route.params;
  const { photo, clearPhoto } = useTryOn();
  const [attempt, setAttempt] = useState(1);
  const [error, setError] = useState('');
  const [photoMissing, setPhotoMissing] = useState(false);

  useEffect(() => {
    if (!photo) {
      navigation.replace('TryOnPhoto', { productId, variantId });
      return undefined;
    }

    let stopped = false;
    let timer;

    async function checkStatus(tryOnId) {
      try {
        const result = await getTryOn(tryOnId);
        if (stopped) return;
        if (result.status === 'completed') navigation.replace('TryOnResult', { tryOnId });
        else if (result.status === 'failed') setError(result.errorMessage || 'The preview could not be created.');
        else timer = setTimeout(() => checkStatus(tryOnId), POLL_INTERVAL_MS);
      } catch (statusError) {
        if (!stopped) setError(statusError.message);
      }
    }

    async function start() {
      setError('');
      try {
        const created = await createTryOn(photo.id, productId, variantId);
        checkStatus(created.id);
      } catch (startError) {
        if (stopped) return;
        setError(startError.message);
        // The server deletes old photos, so a missing photo means the customer must upload it again.
        if (startError.status === 404) setPhotoMissing(true);
      }
    }

    start();
    return () => { stopped = true; clearTimeout(timer); };
  }, [attempt]);

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} />
        {photoMissing ? (
          <Button title="Upload photo again" onPress={() => { clearPhoto(); navigation.replace('TryOnPhoto', { productId, variantId }); }} />
        ) : (
          <Button title="Try again" onPress={() => setAttempt(attempt + 1)} />
        )}
        <Button title="Go back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingView message="Creating your preview with AI. This can take up to a minute…" />
      <Text style={styles.hint}>Please keep this screen open.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  hint: { textAlign: 'center', color: '#6B7280' },
});
