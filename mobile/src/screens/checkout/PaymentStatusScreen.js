import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import { cancelOrder } from '../../services/orderService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';

// Shows the result of a payment. For a successful payment this is also the order confirmation page.
export default function PaymentStatusScreen({ navigation, route }) {
  const { status, orderId, message } = route.params;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCancelOrder() {
    setBusy(true);
    try {
      await cancelOrder(orderId);
      navigation.navigate('Tabs');
    } catch (cancelError) {
      setError(cancelError.message);
      setBusy(false);
    }
  }

  if (status === 'success') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.icon}>✅</Text>
        <Text style={commonStyles.title}>Order confirmed</Text>
        <Text style={styles.text}>Thank you! Your payment was verified. Your order number is #{orderId}.</Text>
        <Button title="View order" onPress={() => navigation.replace('OrderDetails', { orderId })} />
        <Button title="Continue shopping" variant="secondary" onPress={() => navigation.navigate('Tabs')} />
      </ScrollView>
    );
  }

  if (status === 'unconfirmed') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={commonStyles.title}>We are still confirming your payment</Text>
        <Text style={styles.text}>
          {message}. If money was deducted, your order will be confirmed automatically as soon as Razorpay tells us. Check "My orders" in a few minutes.
        </Text>
        <Button title="View my orders" onPress={() => navigation.navigate('OrderHistory')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={commonStyles.title}>{status === 'cancelled' ? 'Payment cancelled' : 'Payment failed'}</Text>
      <Text style={styles.text}>Your items are still held for a few minutes. You can try paying again or cancel the order.</Text>
      <ErrorMessage message={error} />
      <Button title="Try payment again" onPress={() => navigation.replace('Payment', { orderId })} />
      <Button title="Cancel order" variant="danger" onPress={handleCancelOrder} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 14, alignItems: 'stretch', justifyContent: 'center', flexGrow: 1 },
  icon: { fontSize: 56, textAlign: 'center' },
  text: { fontSize: 15, color: colors.text, textAlign: 'center' },
});
