import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { listInventoryLogs } from '../../services/adminService';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

const REASON_LABELS = { RESERVED: 'Reserved by an order', RELEASED: 'Released back to stock', ADMIN_ADJUSTMENT: 'Changed by admin' };

export default function AdminInventoryScreen() {
  const { data: logs, loading, error, reload } = useApi(() => listInventoryLogs());

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      data={logs}
      keyExtractor={(log) => String(log.id)}
      ListEmptyComponent={<EmptyState message="No inventory changes yet." />}
      renderItem={({ item }) => (
        <View style={commonStyles.card}>
          <View style={commonStyles.spaceBetween}>
            <Text style={commonStyles.subtitle} numberOfLines={1}>{item.productName} ({item.size}, {item.color})</Text>
            <Text style={{ fontWeight: '700', color: item.changeAmount < 0 ? colors.danger : colors.success }}>
              {item.changeAmount > 0 ? `+${item.changeAmount}` : item.changeAmount}
            </Text>
          </View>
          <Text style={commonStyles.mutedText}>
            {REASON_LABELS[item.reason]}{item.orderId ? ` · order #${item.orderId}` : ''}{item.changedByName ? ` · ${item.changedByName}` : ''} · stock now {item.stockAfter}
          </Text>
        </View>
      )}
    />
  );
}
