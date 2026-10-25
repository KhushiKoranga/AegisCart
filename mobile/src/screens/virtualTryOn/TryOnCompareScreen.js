import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { addToCart } from '../../services/cartService';
import { listHistory, saveTryOn, unsaveTryOn } from '../../services/tryOnService';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import OptionChips from '../../components/OptionChips';
import PrivateImage from '../../components/PrivateImage';

const MAX_COMPARED = 4;

export default function TryOnCompareScreen({ navigation, route }) {
  const { data, loading, error, reload } = useApi(async () => (await listHistory()).filter((item) => item.status === 'completed'));
  const [chosenIds, setChosenIds] = useState(route.params && route.params.firstId ? [route.params.firstId] : []);
  const [message, setMessage] = useState('');

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (data.length === 0) return <EmptyState message="Create at least two previews to compare them." />;

  function toggle(id) {
    if (chosenIds.includes(id)) setChosenIds(chosenIds.filter((chosenId) => chosenId !== id));
    else if (chosenIds.length < MAX_COMPARED) setChosenIds([...chosenIds, id]);
  }

  async function run(action) {
    setMessage('');
    try {
      await action();
    } catch (actionError) {
      setMessage(actionError.message);
    }
  }

  const options = data.map((item) => ({ key: item.id, label: `${item.productName} · ${item.color}` }));
  const chosen = data.filter((item) => chosenIds.includes(item.id));

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      <Text style={commonStyles.mutedText}>Choose 2 to {MAX_COMPARED} previews.</Text>
      <OptionChips options={options} selectedKeys={chosenIds} onSelect={toggle} />
      <ErrorMessage message={message} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chosen.map((item) => (
          <View key={item.id} style={[commonStyles.card, styles.card]}>
            <PrivateImage path={item.imageUrl} style={styles.image} />
            <Text style={commonStyles.subtitle} numberOfLines={2}>{item.productName}</Text>
            <Text style={commonStyles.mutedText}>{item.color}</Text>
            <Button title={item.isSaved ? '♥ Favourite' : '♡ Choose as favourite'} variant="secondary"
              onPress={() => run(async () => { if (item.isSaved) await unsaveTryOn(item.id); else await saveTryOn(item.id); reload(); })} />
            <Button title="Add to cart" onPress={() => run(async () => { await addToCart(item.variantId, 1); Alert.alert('Added to cart'); })} />
            <Text style={styles.link} onPress={() => navigation.navigate('ProductDetails', { productId: item.productId, preferredVariantId: item.variantId })}>
              Open product
            </Text>
          </View>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12 },
  card: { width: 220 },
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: 10 },
  link: { color: colors.accent, fontWeight: '600', textAlign: 'center' },
});
