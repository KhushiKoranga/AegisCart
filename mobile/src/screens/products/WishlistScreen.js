import React from 'react';
import { FlatList, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { getWishlist, removeFromWishlist } from '../../services/wishlistService';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import ProductCard from '../../components/ProductCard';
import Button from '../../components/Button';

export default function WishlistScreen({ navigation }) {
  const { data, loading, error, reload } = useApi(() => getWishlist());

  async function handleRemove(productId) {
    await removeFromWishlist(productId);
    reload();
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      data={data}
      numColumns={2}
      keyExtractor={(product) => String(product.id)}
      ListEmptyComponent={<EmptyState message="Your wishlist is empty." />}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />
          <Button title="Remove" variant="secondary" style={{ marginHorizontal: 6 }} onPress={() => handleRemove(item.id)} />
        </View>
      )}
    />
  );
}
