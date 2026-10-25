import React, { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { createPaymentOrder, verifyPayment } from '../../services/orderService';
import { buildRazorpayHtml } from '../../utils/razorpayHtml';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

export default function PaymentScreen({ navigation, route }) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const [html, setHtml] = useState(null);
  const [error, setError] = useState('');
  const handled = useRef(false);

  async function startPayment() {
    setError('');
    try {
      const details = await createPaymentOrder(orderId);
      setHtml(buildRazorpayHtml({ ...details, customerName: user.name, customerEmail: user.email }));
    } catch (startError) {
      setError(startError.message);
    }
  }

  useEffect(() => { startPayment(); }, []);

  // The payment result is never trusted on its own: the server checks Razorpay's signature.
  async function handleMessage(event) {
    if (handled.current) return;
    const message = JSON.parse(event.nativeEvent.data);

    if (message.type === 'success') {
      handled.current = true;
      try {
        await verifyPayment({
          razorpayOrderId: message.payment.razorpay_order_id,
          razorpayPaymentId: message.payment.razorpay_payment_id,
          razorpaySignature: message.payment.razorpay_signature,
        });
        navigation.replace('PaymentStatus', { status: 'success', orderId });
      } catch (verifyError) {
        navigation.replace('PaymentStatus', { status: 'unconfirmed', orderId, message: verifyError.message });
      }
    } else if (message.type === 'failed') {
      // Razorpay lets the customer retry inside the checkout window, so we only note the message.
      setError(message.message || 'The payment failed. You can try again.');
    } else if (message.type === 'cancelled') {
      handled.current = true;
      navigation.replace('PaymentStatus', { status: 'cancelled', orderId });
    }
  }

  if (error && !html) return <ErrorMessage message={error} onRetry={startPayment} />;
  if (!html) return <LoadingView message="Preparing secure payment…" />;

  return (
    <>
      <ErrorMessage message={error} />
      <WebView originWhitelist={['*']} source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
        javaScriptEnabled onMessage={handleMessage} />
    </>
  );
}
