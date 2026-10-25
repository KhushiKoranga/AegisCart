import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import { getDashboard, getSalesReport } from '../../services/adminService';
import { formatDate, formatPrice } from '../../utils/format';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

function StatBox({ label, value, warn }) {
  return (
    <View style={[commonStyles.card, styles.stat]}>
      <Text style={[styles.statValue, warn && value > 0 && { color: colors.danger }]}>{value}</Text>
      <Text style={commonStyles.mutedText}>{label}</Text>
    </View>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { logout } = useAuth();
  const { data, loading, error, reload } = useApi(async () => ({
    stats: await getDashboard(),
    report: await getSalesReport(30),
  }));

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { stats, report } = data;

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content}>
      <View style={styles.grid}>
        <StatBox label="Revenue" value={formatPrice(stats.revenue)} />
        <StatBox label="Paid orders" value={stats.paidOrders} />
        <StatBox label="Orders to ship" value={stats.ordersToShip} />
        <StatBox label="Customers" value={stats.customers} />
        <StatBox label="Low stock variants" value={stats.lowStockVariants} warn />
        <StatBox label="Refunds needed" value={stats.paymentsNeedingRefund} warn />
      </View>

      <View style={commonStyles.card}>
        <Text style={commonStyles.subtitle}>Sales, last {report.days} days</Text>
        {report.daily.length === 0 ? <Text style={commonStyles.mutedText}>No paid orders yet.</Text> : null}
        {report.daily.map((day) => (
          <View key={String(day.day)} style={commonStyles.spaceBetween}>
            <Text style={commonStyles.bodyText}>{formatDate(day.day)} · {day.orders} order(s)</Text>
            <Text style={commonStyles.bodyText}>{formatPrice(day.revenue)}</Text>
          </View>
        ))}
        <Text style={[commonStyles.subtitle, { marginTop: 8 }]}>Top products</Text>
        {report.topProducts.map((product) => (
          <View key={product.productName} style={commonStyles.spaceBetween}>
            <Text style={commonStyles.bodyText}>{product.productName}</Text>
            <Text style={commonStyles.bodyText}>{product.unitsSold} sold</Text>
          </View>
        ))}
      </View>

      <Button title="Orders" onPress={() => navigation.navigate('AdminOrders')} />
      <Button title="Products" onPress={() => navigation.navigate('AdminProducts')} />
      <Button title="Categories" variant="secondary" onPress={() => navigation.navigate('AdminCategories')} />
      <Button title="Flash sales" variant="secondary" onPress={() => navigation.navigate('AdminFlashSales')} />
      <Button title="Inventory changes" variant="secondary" onPress={() => navigation.navigate('AdminInventory')} />
      <Button title="Log out" variant="danger" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
});
