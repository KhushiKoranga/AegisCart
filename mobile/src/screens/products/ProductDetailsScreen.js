import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { getProduct } from '../../services/productService';
import { addToCart } from '../../services/cartService';
import { addToWishlist, getWishlist, removeFromWishlist } from '../../services/wishlistService';
import { formatPrice } from '../../utils/format';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import OptionChips from '../../components/OptionChips';
import ProductCard from '../../components/ProductCard';
import QuantityStepper from '../../components/QuantityStepper';

export default function ProductDetailsScreen({ navigation, route }) {
  const { productId, preferredVariantId } = route.params;
  const product = useApi(() => getProduct(productId), [productId]);
  const wishlist = useApi(() => getWishlist());

  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Pick the first colour and size when the product loads.
  useEffect(() => {
    if (!product.data) return;
    const first = product.data.variants.find((variant) => variant.id === preferredVariantId) || product.data.variants[0];
    if (first) {
      setColor(first.color);
      setSize(first.size);
    }
  }, [product.data, preferredVariantId]);

  if (product.loading) return <LoadingView />;
  if (product.error) return <ErrorMessage message={product.error} onRetry={product.reload} />;

  const details = product.data;
  const colorNames = [...new Set(details.variants.map((variant) => variant.color))];
  const sizesForColor = details.variants.filter((variant) => variant.color === color);
  const selectedVariant = details.variants.find((variant) => variant.color === color && variant.size === size);
  const inWishlist = (wishlist.data || []).some((item) => item.id === productId);

  function chooseColor(newColor) {
    setColor(newColor);
    const sameSize = details.variants.find((variant) => variant.color === newColor && variant.size === size);
    setSize((sameSize || details.variants.find((variant) => variant.color === newColor)).size);
    setQuantity(1);
  }

  async function handleAddToCart() {
    setBusy(true);
    setMessage('');
    try {
      await addToCart(selectedVariant.id, quantity);
      Alert.alert('Added to cart', `${details.name} (${selectedVariant.size}, ${selectedVariant.color})`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleWishlist() {
    try {
      if (inWishlist) await removeFromWishlist(productId);
      else await addToWishlist(productId);
      wishlist.reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const stock = selectedVariant ? selectedVariant.stockQuantity : 0;
  const canTryOn = Boolean(details.tryOnCategory);

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      <FlatList
        horizontal
        data={details.images}
        keyExtractor={(image) => String(image.id)}
        renderItem={({ item }) => <Image source={{ uri: item.imageUrl }} style={styles.galleryImage} />}
        ListEmptyComponent={<View style={styles.galleryImage} />}
      />

      <Text style={commonStyles.title}>{details.name}</Text>
      <View style={commonStyles.row}>
        <Text style={styles.price}>{formatPrice(details.currentPrice)}</Text>
        {details.currentPrice < details.basePrice ? <Text style={styles.oldPrice}>{formatPrice(details.basePrice)}</Text> : null}
      </View>
      <Text style={commonStyles.mutedText}>{details.categoryName}</Text>
      <Text style={commonStyles.bodyText}>{details.description}</Text>

      <Text style={commonStyles.subtitle}>Colour</Text>
      <OptionChips options={colorNames.map((name) => ({ key: name, label: name }))} selectedKey={color} onSelect={chooseColor} />

      <Text style={commonStyles.subtitle}>Size</Text>
      <OptionChips options={sizesForColor.map((variant) => ({ key: variant.size, label: variant.size, disabled: variant.stockQuantity === 0 }))}
        selectedKey={size} onSelect={(newSize) => { setSize(newSize); setQuantity(1); }} />

      <Text style={stock > 0 ? styles.inStock : styles.outOfStock}>
        {stock > 0 ? (stock <= 5 ? `Only ${stock} left` : 'In stock') : 'Out of stock'}
      </Text>

      {stock > 0 ? <QuantityStepper quantity={quantity} onChange={setQuantity} max={Math.min(10, stock)} /> : null}
      <ErrorMessage message={message} />
      <Button title="Add to cart" onPress={handleAddToCart} disabled={stock === 0} loading={busy} />
      <Button title={inWishlist ? '♥ Remove from wishlist' : '♡ Add to wishlist'} variant="secondary" onPress={toggleWishlist} />

      {canTryOn ? (
        <View style={styles.tryOnBox}>
          <Button title="Try On 👗" disabled={!selectedVariant || !selectedVariant.tryOnSupported}
            onPress={() => navigation.navigate('TryOnPhoto', { productId, variantId: selectedVariant.id })} />
          {selectedVariant && !selectedVariant.tryOnSupported ? (
            <Text style={commonStyles.mutedText}>Try-on is not available for the {selectedVariant.color} colour yet.</Text>
          ) : null}
        </View>
      ) : null}

      {details.relatedProducts.length > 0 ? <Text style={commonStyles.subtitle}>You may also like</Text> : null}
      <FlatList
        horizontal
        data={details.relatedProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.relatedCard}>
            <ProductCard product={item} onPress={() => navigation.push('ProductDetails', { productId: item.id })} />
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  galleryImage: { width: 260, height: 340, borderRadius: 12, marginRight: 10, backgroundColor: colors.border },
  price: { fontSize: 22, fontWeight: '700', color: colors.primary },
  oldPrice: { fontSize: 15, color: colors.muted, textDecorationLine: 'line-through' },
  inStock: { color: colors.success, fontWeight: '600' },
  outOfStock: { color: colors.danger, fontWeight: '600' },
  tryOnBox: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#E6F3F3' },
  relatedCard: { width: 170 },
});
