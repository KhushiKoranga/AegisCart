import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { createFlashSale, deleteFlashSale, listFlashSales, listProducts, setFlashSaleActive } from '../../services/adminService';
import { formatDate, formatPrice } from '../../utils/format';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import OptionChips from '../../components/OptionChips';
import TextField from '../../components/TextField';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export default function AdminFlashSalesScreen() {
  const { data, loading, error, reload } = useApi(async () => ({ sales: await listFlashSales(), products: await listProducts() }));
  const [productId, setProductId] = useState(null);
  const [salePrice, setSalePrice] = useState('');
  const [days, setDays] = useState('3');
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

  // The sale starts now and lasts for the chosen number of days.
  const handleCreate = () => run(async () => {
    const now = Date.now();
    await createFlashSale({
      productId, salePrice,
      startsAt: new Date(now).toISOString(),
      endsAt: new Date(now + Number(days) * DAY_IN_MS).toISOString(),
    });
    setSalePrice('');
  });

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      data={data.sales}
      keyExtractor={(sale) => String(sale.id)}
      ListHeaderComponent={
        <View style={[commonStyles.card, { marginBottom: 8 }]}>
          <Text style={commonStyles.subtitle}>New flash sale</Text>
          <OptionChips options={data.products.map((product) => ({ key: product.id, label: product.name }))} selectedKey={productId} onSelect={setProductId} />
          <TextField label="Sale price" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" />
          <TextField label="Lasts for (days)" value={days} onChangeText={setDays} keyboardType="number-pad" />
          <ErrorMessage message={message} />
          <Button title="Start sale" onPress={handleCreate} disabled={!productId} />
        </View>
      }
      renderItem={({ item }) => (
        <View style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>{item.productName}</Text>
          <Text style={commonStyles.bodyText}>{formatPrice(item.salePrice)} (normal {formatPrice(item.basePrice)})</Text>
          <Text style={commonStyles.mutedText}>{formatDate(item.startsAt)} to {formatDate(item.endsAt)}</Text>
          <Text style={{ color: item.isRunning ? colors.success : colors.muted, fontWeight: '600' }}>{item.isRunning ? 'Running now' : 'Not running'}</Text>
          <View style={commonStyles.row}>
            <Button title={item.isActive ? 'Pause' : 'Resume'} variant="secondary" style={{ flex: 1 }} onPress={() => run(() => setFlashSaleActive(item.id, !item.isActive))} />
            <Button title="Delete" variant="danger" style={{ flex: 1 }} onPress={() => run(() => deleteFlashSale(item.id))} />
          </View>
        </View>
      )}
    />
  );
}
