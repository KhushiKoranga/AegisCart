import React, { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { getCart } from '../../services/cartService';
import { createOrder } from '../../services/orderService';
import { createIdempotencyKey, formatPrice } from '../../utils/format';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

export default function CheckoutScreen({ navigation, route }) {
  const { addressId } = route.params;
  const { data: cart, loading, error, reload } = useApi(() => getCart());
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');

  // One key for this checkout attempt. If the request is sent twice (double tap, bad network),
  // the server sees the same key and creates only one order.
  const idempotencyKey = useRef(createIdempotencyKey());

  async function handlePlaceOrder() {
    setPlacing(true);
    setOrderError('');
    try {
      const order = await createOrder(addressId, idempotencyKey.current);
      navigation.navigate('Payment', { orderId: order.id });
    } catch (placeError) {
      setOrderError(placeError.message);
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      <View style={commonStyles.card}>
        <Text style={commonStyles.subtitle}>Order summary</Text>
        {cart.items.map((item) => (
          <View key={item.cartItemId} style={commonStyles.spaceBetween}>
            <Text style={commonStyles.bodyText}>{item.quantity} × {item.productName} ({item.size}, {item.color})</Text>
            <Text style={commonStyles.bodyText}>{formatPrice(item.lineTotal)}</Text>
          </View>
        ))}
        <View style={commonStyles.spaceBetween}>
          <Text style={commonStyles.subtitle}>Total</Text>
          <Text style={commonStyles.subtitle}>{formatPrice(cart.total)}</Text>
        </View>
      </View>

      <Text style={commonStyles.mutedText}>
        When you continue, your items are held for you for a few minutes while you pay. Prices and stock are checked again on the server.
      </Text>
      <ErrorMessage message={orderError} />
      <Button title="Place order and pay" onPress={handlePlaceOrder} loading={placing} disabled={cart.items.length === 0} />
    </ScrollView>
  );
}
