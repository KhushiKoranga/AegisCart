import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import ErrorMessage from '../../components/ErrorMessage';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  }

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>AegisCart</Text>
      <Text style={commonStyles.mutedText}>Log in to continue shopping</Text>

      <View style={styles.form}>
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <ErrorMessage message={error} />
        <Button title="Log in" onPress={handleLogin} loading={loading} />
        <Button title="Create an account" variant="secondary" onPress={() => navigation.navigate('Register')} />
      </View>

      <Text style={styles.adminLink} onPress={() => navigation.navigate('AdminLogin')}>Store admin? Log in here</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 96, gap: 8 },
  logo: { fontSize: 34, fontWeight: '800', color: colors.primary },
  form: { gap: 14, marginTop: 24 },
  adminLink: { marginTop: 24, textAlign: 'center', color: colors.accent, fontWeight: '600' },
});
