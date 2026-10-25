import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { deleteTryOn, listSaved, unsaveTryOn } from '../../services/tryOnService';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import PrivateImage from '../../components/PrivateImage';

export default function SavedTryOnScreen({ navigation }) {
  const { data: saved, loading, error, reload } = useApi(() => listSaved());

  function confirmDelete(item) {
    Alert.alert('Delete preview?', 'The image will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTryOn(item.id); reload(); } },
    ]);
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const header = (
    <View style={commonStyles.content}>
      <Button title="New Virtual Try-On 👗" onPress={() => navigation.navigate('TryOnPhoto')} />
      <Button title="Compare previews" variant="secondary" onPress={() => navigation.navigate('TryOnCompare')} />
    </View>
  );

  return (
    <FlatList
      style={commonStyles.screen}
      data={saved}
      numColumns={2}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState message="No saved looks yet. Save a try-on preview to see it here." />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Pressable onPress={() => navigation.navigate('TryOnResult', { tryOnId: item.id })}>
            <PrivateImage path={item.imageUrl} style={styles.image} />
            <Text style={styles.name} numberOfLines={1}>{item.productName} · {item.color}</Text>
          </Pressable>
          <View style={commonStyles.spaceBetween}>
            <Text style={styles.link} onPress={() => navigation.navigate('ProductDetails', { productId: item.productId, preferredVariantId: item.variantId })}>Product</Text>
            <Text style={styles.link} onPress={async () => { await unsaveTryOn(item.id); reload(); }}>Unsave</Text>
            <Text style={styles.delete} onPress={() => confirmDelete(item)}>Delete</Text>
          </View>
        </View>
      )}
      contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, padding: 8, gap: 6, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: 8 },
  name: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  link: { color: colors.accent, fontWeight: '600', fontSize: 12 },
  delete: { color: colors.danger, fontWeight: '600', fontSize: 12 },
});
