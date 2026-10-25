import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import { listCategories, listProducts } from '../../services/productService';
import Button from '../../components/Button';
import OptionChips from '../../components/OptionChips';
import ProductCard from '../../components/ProductCard';
import LoadingView from '../../components/LoadingView';
import ErrorMessage from '../../components/ErrorMessage';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(async () => ({
    categories: await listCategories(),
    latest: await listProducts({ limit: 6 }),
  }));

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const categoryOptions = data.categories.map((category) => ({ key: category.id, label: category.name }));

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      <Text style={commonStyles.title}>Hi, {user.name.split(' ')[0]} 👋</Text>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Try On 👗 before you buy</Text>
        <Text style={styles.bannerText}>Upload your photo and see clothes on you with AI.</Text>
        <Button title="Start Virtual Try-On" variant="secondary" style={styles.bannerButton}
          onPress={() => navigation.navigate('TryOnPhoto')} />
      </View>

      <Text style={commonStyles.subtitle}>Shop by category</Text>
      <OptionChips options={categoryOptions} onSelect={(categoryId) => navigation.navigate('Shop', { categoryId })} />

      <Text style={commonStyles.subtitle}>New arrivals</Text>
      <FlatList
        data={data.latest}
        numColumns={2}
        scrollEnabled={false}
        keyExtractor={(product) => String(product.id)}
        renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />}
      />

      <View style={commonStyles.row}>
        <Button title="Wishlist" variant="secondary" style={styles.shortcut} onPress={() => navigation.navigate('Wishlist')} />
        <Button title="My orders" variant="secondary" style={styles.shortcut} onPress={() => navigation.navigate('OrderHistory')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, gap: 6 },
  bannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  bannerText: { color: '#C9D6E8', fontSize: 14 },
  bannerButton: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF', marginTop: 8 },
  shortcut: { flex: 1 },
});
