import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { addVariant, deleteVariant, listVariants, setStock } from '../../services/adminService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import TextField from '../../components/TextField';

const EMPTY_FORM = { size: '', color: '', stockQuantity: '0', garmentImageUrl: '' };

export default function AdminVariantsScreen({ route }) {
  const { productId } = route.params;
  const { data: variants, loading, error, reload } = useApi(() => listVariants(productId), [productId]);
  const [stockInputs, setStockInputs] = useState({}); // variantId -> text typed by the admin
  const [form, setForm] = useState(EMPTY_FORM);
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

  const handleAdd = () => run(async () => {
    await addVariant(productId, { ...form, garmentImageUrl: form.garmentImageUrl || undefined });
    setForm(EMPTY_FORM);
  });

  function confirmDelete(variant) {
    Alert.alert('Delete variant?', `${variant.size} / ${variant.color}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteVariant(variant.id)) },
    ]);
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      <ErrorMessage message={message} />
      {variants.map((variant) => (
        <View key={variant.id} style={commonStyles.card}>
          <Text style={commonStyles.subtitle}>{variant.size} · {variant.color}</Text>
          <Text style={commonStyles.mutedText}>In stock: {variant.stockQuantity} · {variant.garmentImageUrl ? 'has try-on image' : 'no try-on image'}</Text>
          <View style={commonStyles.row}>
            <View style={{ flex: 1 }}>
              <TextField placeholder="New stock" keyboardType="number-pad" value={stockInputs[variant.id] || ''}
                onChangeText={(text) => setStockInputs({ ...stockInputs, [variant.id]: text })} />
            </View>
            <Button title="Set stock" onPress={() => run(() => setStock(variant.id, stockInputs[variant.id]))} />
          </View>
          <Text style={{ color: 'red' }} onPress={() => confirmDelete(variant)}>Delete variant</Text>
        </View>
      ))}

      <View style={commonStyles.card}>
        <Text style={commonStyles.subtitle}>Add a variant</Text>
        <TextField label="Size" value={form.size} onChangeText={(size) => setForm({ ...form, size })} autoCapitalize="characters" />
        <TextField label="Colour" value={form.color} onChangeText={(color) => setForm({ ...form, color })} autoCapitalize="words" />
        <TextField label="Stock" value={form.stockQuantity} onChangeText={(stockQuantity) => setForm({ ...form, stockQuantity })} keyboardType="number-pad" />
        <TextField label="Garment image URL (for Try-On, public link)" value={form.garmentImageUrl}
          onChangeText={(garmentImageUrl) => setForm({ ...form, garmentImageUrl })} keyboardType="url" />
        <Button title="Add variant" onPress={handleAdd} />
      </View>
    </ScrollView>
  );
}
