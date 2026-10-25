import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { listCategories, listProducts } from '../../services/productService';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import OptionChips from '../../components/OptionChips';
import ProductCard from '../../components/ProductCard';
import TextField from '../../components/TextField';

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_low', label: 'Price: low to high' },
  { key: 'price_high', label: 'Price: high to low' },
];

export default function ProductListScreen({ navigation, route }) {
  // "applied" are the filters sent to the server. The text boxes only change "draft" until Apply is pressed.
  const [applied, setApplied] = useState({ sort: 'newest' });
  const [draft, setDraft] = useState({ search: '', minPrice: '', maxPrice: '' });

  // The home screen can open this tab with a category already chosen.
  useEffect(() => {
    if (route.params && route.params.categoryId) setApplied((current) => ({ ...current, categoryId: route.params.categoryId }));
  }, [route.params]);

  const categories = useApi(() => listCategories());
  const products = useApi(() => listProducts({ ...applied, limit: 50 }), [applied]);

  const categoryOptions = [{ key: 'all', label: 'All' }, ...(categories.data || []).map((c) => ({ key: c.id, label: c.name }))];

  function applyFilters() {
    setApplied({ ...applied, search: draft.search.trim(), minPrice: draft.minPrice, maxPrice: draft.maxPrice });
  }

  const header = (
    <View style={commonStyles.content}>
      <TextField placeholder="Search products" value={draft.search} onChangeText={(search) => setDraft({ ...draft, search })}
        onSubmitEditing={applyFilters} returnKeyType="search" />
      <OptionChips options={categoryOptions} selectedKey={applied.categoryId || 'all'}
        onSelect={(key) => setApplied({ ...applied, categoryId: key === 'all' ? undefined : key })} />
      <View style={styles.priceRow}>
        <View style={styles.priceBox}><TextField placeholder="Min price" value={draft.minPrice} keyboardType="numeric"
          onChangeText={(minPrice) => setDraft({ ...draft, minPrice })} /></View>
        <View style={styles.priceBox}><TextField placeholder="Max price" value={draft.maxPrice} keyboardType="numeric"
          onChangeText={(maxPrice) => setDraft({ ...draft, maxPrice })} /></View>
        <Button title="Apply" onPress={applyFilters} />
      </View>
      <OptionChips options={SORT_OPTIONS} selectedKey={applied.sort} onSelect={(sort) => setApplied({ ...applied, sort })} />
      <ErrorMessage message={products.error} onRetry={products.reload} />
    </View>
  );

  return (
    <FlatList
      style={commonStyles.screen}
      data={products.data || []}
      numColumns={2}
      keyExtractor={(product) => String(product.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={products.loading ? <LoadingView /> : <EmptyState message="No products match your search." />}
      renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 6, paddingBottom: 24 },
  priceRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  priceBox: { flex: 1 },
});
