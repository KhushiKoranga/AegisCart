import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { listOrders } from '../../services/orderService';
import { formatDate, formatPrice, orderStatusLabel } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

export default function OrderHistoryScreen({ navigation }) {
  const { data: orders, loading, error, reload } = useApi(() => listOrders());

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      data={orders}
      keyExtractor={(order) => String(order.id)}
      ListEmptyComponent={<EmptyState message="You have not placed any orders yet." />}
      renderItem={({ item }) => (
        <Pressable style={commonStyles.card} onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}>
          <View style={commonStyles.spaceBetween}>
            <Text style={commonStyles.subtitle}>Order #{item.id}</Text>
            <Text style={styles.status}>{orderStatusLabel(item.status)}</Text>
          </View>
          <Text style={commonStyles.mutedText}>{formatDate(item.createdAt)} · {item.itemCount} item(s)</Text>
          <Text style={commonStyles.bodyText}>{formatPrice(item.totalAmount)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  status: { color: colors.accent, fontWeight: '600' },
});
