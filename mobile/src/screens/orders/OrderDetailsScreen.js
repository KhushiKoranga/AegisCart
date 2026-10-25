import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { cancelOrder, getOrder } from '../../services/orderService';
import { formatDate, formatPrice, orderStatusLabel } from '../../utils/format';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

export default function OrderDetailsScreen({ navigation, route }) {
  const { orderId } = route.params;
  const { data: order, loading, error, reload } = useApi(() => getOrder(orderId), [orderId]);
  const [actionError, setActionError] = useState('');

  async function handleCancel() {
    setActionError('');
    try {
      await cancelOrder(orderId);
      reload();
    } catch (cancelError) {
      setActionError(cancelError.message);
    }
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      <View style={commonStyles.card}>
        <Text style={commonStyles.title}>Order #{order.id}</Text>
        <Text style={{ color: colors.accent, fontWeight: '700' }}>{orderStatusLabel(order.status)}</Text>
        <Text style={commonStyles.mutedText}>Placed on {formatDate(order.createdAt)}</Text>
        {order.paymentStatus ? <Text style={commonStyles.mutedText}>Payment: {order.paymentStatus}</Text> : null}
      </View>

      <View style={commonStyles.card}>
        <Text style={commonStyles.subtitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={commonStyles.spaceBetween}>
            <Text style={[commonStyles.bodyText, { flex: 1 }]}>{item.quantity} × {item.productName} ({item.size}, {item.color})</Text>
            <Text style={commonStyles.bodyText}>{formatPrice(item.unitPrice * item.quantity)}</Text>
          </View>
        ))}
        <View style={commonStyles.spaceBetween}>
          <Text style={commonStyles.subtitle}>Total</Text>
          <Text style={commonStyles.subtitle}>{formatPrice(order.totalAmount)}</Text>
        </View>
      </View>

      <View style={commonStyles.card}>
        <Text style={commonStyles.subtitle}>Delivery address</Text>
        <Text style={commonStyles.bodyText}>{order.shippingAddress}</Text>
      </View>

      <ErrorMessage message={actionError} />
      {order.status === 'PENDING_PAYMENT' ? (
        <>
          <Button title="Pay now" onPress={() => navigation.navigate('Payment', { orderId })} />
          <Button title="Cancel order" variant="danger" onPress={handleCancel} />
        </>
      ) : null}
    </ScrollView>
  );
}
