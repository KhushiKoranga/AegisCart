// Builds the small web page that opens Razorpay Checkout inside a WebView.
// The page sends the result back to the app with postMessage.
export function buildRazorpayHtml({ keyId, razorpayOrderId, amountInPaise, currency, customerName, customerEmail }) {
  const options = {
    key: keyId,
    order_id: razorpayOrderId,
    amount: amountInPaise,
    currency,
    name: 'AegisCart',
    prefill: { name: customerName, email: customerEmail },
  };
  // "<" is escaped so the data can never close the script tag.
  const optionsJson = JSON.stringify(options).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#F5F6F8;font-family:sans-serif;text-align:center;padding-top:40px">
<p>Opening secure payment…</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function sendToApp(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  var options = ${optionsJson};
  options.handler = function (response) { sendToApp({ type: 'success', payment: response }); };
  options.modal = { ondismiss: function () { sendToApp({ type: 'cancelled' }); } };
  var checkout = new Razorpay(options);
  checkout.on('payment.failed', function (response) {
    sendToApp({ type: 'failed', message: response.error && response.error.description });
  });
  checkout.open();
</script>
</body>
</html>`;
}
