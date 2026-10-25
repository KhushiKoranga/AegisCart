import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { listProducts } from '../../services/productService';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import ProductCard from '../../components/ProductCard';

// Lists every product that supports try-on. The customer's uploaded photo is reused.
export default function TryOnOutfitPickerScreen({ navigation }) {
  const { data: products, loading, error, reload } = useApi(() => listProducts({ tryOnOnly: true, limit: 50 }));

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      data={products}
      numColumns={2}
      keyExtractor={(product) => String(product.id)}
      ListHeaderComponent={<View style={commonStyles.content}><Text style={commonStyles.mutedText}>Tap an outfit to see it on your photo.</Text></View>}
      ListEmptyComponent={<EmptyState message="No products support try-on yet." />}
      renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('TryOnProcessing', { productId: item.id })} />}
    />
  );
}
