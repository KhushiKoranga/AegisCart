import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { listOrders, updateOrderStatus } from '../../services/adminService';
import { formatDate, formatPrice, orderStatusLabel } from '../../utils/format';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import OptionChips from '../../components/OptionChips';

const FILTERS = ['all', 'PENDING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED']
  .map((key) => ({ key, label: key === 'all' ? 'All' : orderStatusLabel(key) }));

// The server accepts only these changes. The buttons just match its rules.
const NEXT_STATUSES = { CONFIRMED: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'] };

export default function AdminOrdersScreen() {
  const [filter, setFilter] = useState('all');
  const { data: orders, loading, error, reload } = useApi(() => listOrders(filter === 'all' ? undefined : filter), [filter]);
  const [message, setMessage] = useState('');

  async function changeStatus(order, status) {
    setMessage('');
    try {
      await updateOrderStatus(order.id, status);
      reload();
    } catch (changeError) {
      setMessage(changeError.message);
    }
  }

  function confirmChange(order, status) {
    const warning = status === 'CANCELLED' ? 'The stock is returned and the payment is marked for refund.' : `Mark as ${orderStatusLabel(status)}?`;
    Alert.alert(`Order #${order.id}`, warning, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => changeStatus(order, status) },
    ]);
  }

  return (
    <FlatList
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      data={orders || []}
      keyExtractor={(order) => String(order.id)}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <OptionChips options={FILTERS} selectedKey={filter} onSelect={setFilter} />
          <ErrorMessage message={message || error} onRetry={error ? reload : undefined} />
        </View>
      }
      ListEmptyComponent={loading ? <LoadingView /> : <EmptyState message="No orders." />}
      renderItem={({ item }) => (
        <View style={commonStyles.card}>
          <View style={commonStyles.spaceBetween}>
            <Text style={commonStyles.subtitle}>Order #{item.id}</Text>
            <Text style={{ color: colors.accent, fontWeight: '600' }}>{orderStatusLabel(item.status)}</Text>
          </View>
          <Text style={commonStyles.bodyText}>{item.customerName} · {item.customerEmail}</Text>
          <Text style={commonStyles.mutedText}>{formatDate(item.createdAt)} · {formatPrice(item.totalAmount)} · payment {item.paymentStatus || 'none'}</Text>
          {item.paymentStatus === 'NEEDS_REFUND' ? <Text style={{ color: colors.danger }}>Refund this payment in the Razorpay dashboard.</Text> : null}
          <View style={commonStyles.row}>
            {(NEXT_STATUSES[item.status] || []).map((status) => (
              <Button key={status} title={orderStatusLabel(status)} variant={status === 'CANCELLED' ? 'danger' : 'primary'}
                style={{ flex: 1 }} onPress={() => confirmChange(item, status)} />
            ))}
          </View>
        </View>
      )}
    />
  );
}
