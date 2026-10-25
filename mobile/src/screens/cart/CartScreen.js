import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { getCart, removeCartItem, updateCartItem } from '../../services/cartService';
import { formatPrice } from '../../utils/format';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import QuantityStepper from '../../components/QuantityStepper';

export default function CartScreen({ navigation }) {
  const { data: cart, loading, error, reload } = useApi(() => getCart());
  const [actionError, setActionError] = useState('');

  async function runAction(action) {
    setActionError('');
    try {
      await action();
      reload();
    } catch (actionFailure) {
      setActionError(actionFailure.message);
    }
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const hasUnavailableItem = cart.items.some((item) => !item.inStock);

  return (
    <View style={commonStyles.screen}>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => String(item.cartItemId)}
        contentContainerStyle={commonStyles.content}
        ListEmptyComponent={<EmptyState message="Your cart is empty." />}
        renderItem={({ item }) => (
          <View style={[commonStyles.card, styles.item]}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={styles.details}>
              <Text style={commonStyles.subtitle} numberOfLines={2}>{item.productName}</Text>
              <Text style={commonStyles.mutedText}>{item.size} · {item.color}</Text>
              <Text style={styles.price}>{formatPrice(item.unitPrice)}</Text>
              {!item.inStock ? <Text style={styles.warning}>Not enough stock (only {item.stockQuantity} left)</Text> : null}
              <View style={commonStyles.spaceBetween}>
                <QuantityStepper quantity={item.quantity} max={Math.min(10, Math.max(item.stockQuantity, 1))}
                  onChange={(quantity) => runAction(() => updateCartItem(item.cartItemId, quantity))} />
                <Text style={styles.remove} onPress={() => runAction(() => removeCartItem(item.cartItemId))}>Remove</Text>
              </View>
            </View>
          </View>
        )}
      />

      {cart.items.length > 0 ? (
        <View style={styles.footer}>
          <ErrorMessage message={actionError} />
          <View style={commonStyles.spaceBetween}>
            <Text style={commonStyles.subtitle}>Total ({cart.itemCount} items)</Text>
            <Text style={styles.total}>{formatPrice(cart.total)}</Text>
          </View>
          <Text style={commonStyles.mutedText}>Stock is reserved only when you place the order.</Text>
          <Button title="Checkout" disabled={hasUnavailableItem} onPress={() => navigation.navigate('AddressSelection')} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12 },
  image: { width: 80, height: 106, borderRadius: 8, backgroundColor: colors.border },
  details: { flex: 1, gap: 4 },
  price: { fontWeight: '700', color: colors.primary },
  warning: { color: colors.danger, fontSize: 12 },
  remove: { color: colors.danger, fontWeight: '600' },
  footer: { padding: 16, gap: 8, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border },
  total: { fontSize: 20, fontWeight: '800', color: colors.primary },
});
