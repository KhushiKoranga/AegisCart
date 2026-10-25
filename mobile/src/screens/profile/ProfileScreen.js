import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import { deleteAddress, getProfile, listAddresses, updateProfile } from '../../services/profileService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import TextField from '../../components/TextField';

export default function ProfileScreen({ navigation }) {
  const { logout } = useAuth();
  const profile = useApi(() => getProfile());
  const addresses = useApi(() => listAddresses());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name);
      setPhone(profile.data.phone || '');
    }
  }, [profile.data]);

  async function handleSave() {
    setMessage('');
    setError('');
    try {
      await updateProfile(name.trim(), phone.trim() || undefined);
      setMessage('Profile updated');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function handleDeleteAddress(addressId) {
    await deleteAddress(addressId);
    addresses.reload();
  }

  if (profile.loading) return <LoadingView />;
  if (profile.error) return <ErrorMessage message={profile.error} onRetry={profile.reload} />;

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      <View style={commonStyles.card}>
        <Text style={commonStyles.mutedText}>{profile.data.email}</Text>
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <ErrorMessage message={error} />
        {message ? <Text style={{ color: 'green' }}>{message}</Text> : null}
        <Button title="Save profile" onPress={handleSave} />
      </View>

      <View style={commonStyles.card}>
        <Text style={commonStyles.subtitle}>Saved addresses</Text>
        {(addresses.data || []).length === 0 ? <Text style={commonStyles.mutedText}>You can add an address at checkout.</Text> : null}
        {(addresses.data || []).map((address) => (
          <View key={address.id} style={commonStyles.spaceBetween}>
            <Text style={[commonStyles.bodyText, { flex: 1 }]}>{address.line1}, {address.city} {address.pincode}</Text>
            <Text style={{ color: 'red' }} onPress={() => handleDeleteAddress(address.id)}>Delete</Text>
          </View>
        ))}
      </View>

      <Button title="My orders" variant="secondary" onPress={() => navigation.navigate('OrderHistory')} />
      <Button title="Wishlist" variant="secondary" onPress={() => navigation.navigate('Wishlist')} />
      <Button title="Notifications" variant="secondary" onPress={() => navigation.navigate('Notifications')} />
      <Button title="Log out" variant="danger" onPress={logout} />
    </ScrollView>
  );
}
