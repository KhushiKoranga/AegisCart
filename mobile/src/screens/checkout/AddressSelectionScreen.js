import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { addAddress, listAddresses } from '../../services/profileService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import TextField from '../../components/TextField';

const EMPTY_FORM = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

export default function AddressSelectionScreen({ navigation }) {
  const { data: addresses, loading, error, reload } = useApi(() => listAddresses());
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (field) => (value) => setForm({ ...form, [field]: value });

  async function handleSaveAddress() {
    setSaving(true);
    setFormError('');
    try {
      const saved = await addAddress({ ...form, line2: form.line2 || undefined });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setSelectedId(saved.id);
      reload();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  // Default to the first address when nothing is chosen yet.
  const activeId = selectedId || (addresses[0] && addresses[0].id);

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      {addresses.map((address) => (
        <Pressable key={address.id} onPress={() => setSelectedId(address.id)}
          style={[commonStyles.card, address.id === activeId && styles.selectedCard]}>
          <Text style={commonStyles.subtitle}>{address.fullName}</Text>
          <Text style={commonStyles.bodyText}>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</Text>
          <Text style={commonStyles.bodyText}>{address.city}, {address.state} {address.pincode}</Text>
          <Text style={commonStyles.mutedText}>{address.phone}</Text>
        </Pressable>
      ))}

      {showForm ? (
        <View style={commonStyles.card}>
          <TextField label="Full name" value={form.fullName} onChangeText={setField('fullName')} autoCapitalize="words" />
          <TextField label="Phone" value={form.phone} onChangeText={setField('phone')} keyboardType="phone-pad" />
          <TextField label="Address line 1" value={form.line1} onChangeText={setField('line1')} autoCapitalize="sentences" />
          <TextField label="Address line 2 (optional)" value={form.line2} onChangeText={setField('line2')} autoCapitalize="sentences" />
          <TextField label="City" value={form.city} onChangeText={setField('city')} autoCapitalize="words" />
          <TextField label="State" value={form.state} onChangeText={setField('state')} autoCapitalize="words" />
          <TextField label="Pincode" value={form.pincode} onChangeText={setField('pincode')} keyboardType="number-pad" />
          <ErrorMessage message={formError} />
          <Button title="Save address" onPress={handleSaveAddress} loading={saving} />
        </View>
      ) : (
        <Button title="+ Add a new address" variant="secondary" onPress={() => setShowForm(true)} />
      )}

      <Button title="Continue" disabled={!activeId} onPress={() => navigation.navigate('Checkout', { addressId: activeId })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  selectedCard: { borderColor: colors.primary, borderWidth: 2 },
});
