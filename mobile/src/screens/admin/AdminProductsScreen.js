import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { deleteProduct, listProducts, setProductActive } from '../../services/adminService';
import { formatPrice } from '../../utils/format';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

export default function AdminProductsScreen({ navigation }) {
  const { data: products, loading, error, reload } = useApi(() => listProducts());
  const [message, setMessage] = useState('');

  async function run(action) {
    setMessage('');
    try {
      await action();
      reload();
    } catch (actionError) {
      setMessage(actionError.message);
    }
  }

  function confirmDelete(product) {
    Alert.alert('Delete product?', `${product.name} will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteProduct(product.id)) },
    ]);
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      data={products}
      keyExtractor={(product) => String(product.id)}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <Button title="+ Add product" onPress={() => navigation.navigate('AdminProductForm')} />
          <ErrorMessage message={message} />
        </View>
      }
      renderItem={({ item }) => (
        <View style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>{item.name}</Text>
          <Text style={commonStyles.mutedText}>{item.categoryName} · {formatPrice(item.basePrice)} · stock {item.totalStock}</Text>
          {!item.isActive ? <Text style={{ color: colors.warning }}>Hidden from customers</Text> : null}
          <View style={commonStyles.row}>
            <Button title="Edit" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('AdminProductForm', { productId: item.id })} />
            <Button title="Variants" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('AdminVariants', { productId: item.id })} />
          </View>
          <View style={commonStyles.row}>
            <Button title={item.isActive ? 'Hide' : 'Show'} variant="secondary" style={{ flex: 1 }}
              onPress={() => run(() => setProductActive(item.id, !item.isActive))} />
            <Button title="Delete" variant="danger" style={{ flex: 1 }} onPress={() => confirmDelete(item)} />
          </View>
        </View>
      )}
    />
  );
}
