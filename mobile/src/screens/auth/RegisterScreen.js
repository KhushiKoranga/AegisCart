import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { commonStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import ErrorMessage from '../../components/ErrorMessage';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (field) => (value) => setForm({ ...form, [field]: value });

  async function handleRegister() {
    setLoading(true);
    setError('');
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.phone.trim() || undefined);
    } catch (registerError) {
      setError(registerError.message);
      setLoading(false);
    }
  }

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Full name" value={form.name} onChangeText={setField('name')} autoCapitalize="words" />
      <TextField label="Email" value={form.email} onChangeText={setField('email')} keyboardType="email-address" />
      <TextField label="Phone (optional)" value={form.phone} onChangeText={setField('phone')} keyboardType="phone-pad" />
      <TextField label="Password (at least 8 characters)" value={form.password} onChangeText={setField('password')} secureTextEntry />
      <ErrorMessage message={error} />
      <Button title="Register" onPress={handleRegister} loading={loading} />
    </ScrollView>
  );
}
