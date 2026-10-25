import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { addProductImage, createProduct, deleteProductImage, getProduct, listCategories, updateProduct } from '../../services/adminService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import OptionChips from '../../components/OptionChips';
import TextField from '../../components/TextField';

const TRY_ON_OPTIONS = [
  { key: 'none', label: 'No try-on' },
  { key: 'upper_body', label: 'Top' },
  { key: 'lower_body', label: 'Bottom' },
  { key: 'dresses', label: 'Dress' },
];

// Used for both adding (no productId) and editing a product.
export default function AdminProductFormScreen({ navigation, route }) {
  const productId = route.params && route.params.productId;
  const { data, loading, error, reload } = useApi(async () => ({
    categories: await listCategories(),
    product: productId ? await getProduct(productId) : null,
  }), [productId]);

  const [form, setForm] = useState({ name: '', description: '', basePrice: '', categoryId: null, tryOnCategory: 'none', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!data) return;
    if (data.product) {
      const product = data.product;
      setForm((current) => ({ ...current, name: product.name, description: product.description, basePrice: String(product.basePrice),
        categoryId: product.categoryId, tryOnCategory: product.tryOnCategory || 'none' }));
    } else if (data.categories[0]) {
      setForm((current) => ({ ...current, categoryId: current.categoryId || data.categories[0].id }));
    }
  }, [data]);

  const setField = (field) => (value) => setForm({ ...form, [field]: value });

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const product = {
      name: form.name, description: form.description, basePrice: form.basePrice, categoryId: form.categoryId,
      tryOnCategory: form.tryOnCategory === 'none' ? undefined : form.tryOnCategory,
    };
    try {
      const saved = productId ? await updateProduct(productId, product) : await createProduct(product);
      if (form.imageUrl.trim()) await addProductImage(saved.id, form.imageUrl.trim());
      navigation.goBack();
    } catch (saveError) {
      setMessage(saveError.message);
      setSaving(false);
    }
  }

  async function handleDeleteImage(imageId) {
    await deleteProductImage(imageId);
    reload();
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Name" value={form.name} onChangeText={setField('name')} autoCapitalize="words" />
      <TextField label="Description" value={form.description} onChangeText={setField('description')} multiline autoCapitalize="sentences" />
      <TextField label="Price" value={form.basePrice} onChangeText={setField('basePrice')} keyboardType="decimal-pad" />

      <Text style={commonStyles.subtitle}>Category</Text>
      <OptionChips options={data.categories.map((category) => ({ key: category.id, label: category.name }))}
        selectedKey={form.categoryId} onSelect={setField('categoryId')} />

      <Text style={commonStyles.subtitle}>Virtual Try-On garment type</Text>
      <OptionChips options={TRY_ON_OPTIONS} selectedKey={form.tryOnCategory} onSelect={setField('tryOnCategory')} />

      {data.product ? data.product.images.map((image) => (
        <View key={image.id} style={commonStyles.spaceBetween}>
          <Text style={[commonStyles.mutedText, { flex: 1 }]} numberOfLines={1}>{image.imageUrl}</Text>
          <Text style={{ color: 'red' }} onPress={() => handleDeleteImage(image.id)}>Remove</Text>
        </View>
      )) : null}
      <TextField label="Add image (URL)" value={form.imageUrl} onChangeText={setField('imageUrl')} keyboardType="url" />

      <ErrorMessage message={message} />
      <Button title="Save product" onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}
