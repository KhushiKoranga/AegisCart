import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { getProduct } from '../../services/productService';
import { addToCart } from '../../services/cartService';
import { deleteTryOn, getTryOn, saveTryOn, unsaveTryOn } from '../../services/tryOnService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import OptionChips from '../../components/OptionChips';
import PrivateImage from '../../components/PrivateImage';

export default function TryOnResultScreen({ navigation, route }) {
  const { tryOnId } = route.params;
  const { data, loading, error, reload } = useApi(async () => {
    const tryOn = await getTryOn(tryOnId);
    return { tryOn, product: await getProduct(tryOn.productId) };
  }, [tryOnId]);
  const [message, setMessage] = useState('');

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { tryOn, product } = data;

  // One chip per colour. A colour without a garment image cannot be tried on.
  const colorNames = [...new Set(product.variants.map((variant) => variant.color))];
  const variantForColor = (color) => {
    const matching = product.variants.filter((variant) => variant.color === color);
    return matching.find((variant) => variant.tryOnSupported) || matching[0];
  };
  const colorOptions = colorNames.map((color) => ({ key: color, label: color, disabled: !variantForColor(color).tryOnSupported }));
  const hasUnsupportedColor = colorOptions.some((option) => option.disabled);

  async function run(action) {
    setMessage('');
    try {
      await action();
    } catch (actionError) {
      setMessage(actionError.message);
    }
  }

  const toggleFavourite = () => run(async () => {
    if (tryOn.isSaved) await unsaveTryOn(tryOnId);
    else await saveTryOn(tryOnId);
    reload();
  });

  const handleAddToCart = () => run(async () => {
    await addToCart(tryOn.variantId, 1);
    Alert.alert('Added to cart', `${tryOn.productName} (${tryOn.size}, ${tryOn.color})`);
  });

  function confirmDelete() {
    Alert.alert('Delete this preview?', 'The generated image will be deleted from our server.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(async () => { await deleteTryOn(tryOnId); navigation.goBack(); }) },
    ]);
  }

  // A new colour means a new AI preview made from that colour's own garment image.
  function tryColor(color) {
    navigation.push('TryOnProcessing', { productId: tryOn.productId, variantId: variantForColor(color).id });
  }

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      <PrivateImage path={tryOn.imageUrl} style={styles.image} />
      <Text style={commonStyles.mutedText}>AI-generated preview. The real garment may look slightly different.</Text>
      <Text style={commonStyles.title}>{tryOn.productName}</Text>

      <Text style={commonStyles.subtitle}>Colour</Text>
      <OptionChips options={colorOptions} selectedKey={tryOn.color} onSelect={(color) => color !== tryOn.color && tryColor(color)} />
      {hasUnsupportedColor ? <Text style={commonStyles.mutedText}>Greyed-out colours have no garment image yet, so they cannot be tried on.</Text> : null}

      <ErrorMessage message={message} />
      <Button title={tryOn.isSaved ? '♥ Saved to favourites' : '♡ Save to favourites'} variant="secondary" onPress={toggleFavourite} />
      <Button title="Try another outfit" onPress={() => navigation.navigate('TryOnOutfitPicker')} />
      <Button title="Compare previews" variant="secondary" onPress={() => navigation.navigate('TryOnCompare', { firstId: tryOnId })} />
      <View style={commonStyles.row}>
        <Button title="View product" variant="secondary" style={styles.flex}
          onPress={() => navigation.navigate('ProductDetails', { productId: tryOn.productId, preferredVariantId: tryOn.variantId })} />
        <Button title="Add to cart" style={styles.flex} onPress={handleAddToCart} />
      </View>
      <Button title="Delete this preview" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14 },
  flex: { flex: 1 },
});
