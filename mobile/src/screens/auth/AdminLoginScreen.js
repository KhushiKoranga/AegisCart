import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { commonStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import ErrorMessage from '../../components/ErrorMessage';

export default function AdminLoginScreen() {
  const { loginAsAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      await loginAsAdmin(email.trim(), password);
    } catch (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  }

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      <Text style={commonStyles.mutedText}>Only accounts with the admin role can log in here.</Text>
      <TextField label="Admin email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorMessage message={error} />
      <Button title="Log in as admin" onPress={handleLogin} loading={loading} />
    </ScrollView>
  );
}
