export async function createRazorpayOrder({ keyId, keySecret, amountInPaise, currency, receipt }) {
  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ amount: amountInPaise, currency, receipt }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Razorpay order creation failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function hmacHex(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Verifies the payment really happened and belongs to this order: Razorpay's
// documented check is HMAC_SHA256(order_id + "|" + payment_id, key_secret)
// and compare against the signature the client received from Checkout.js.
// This can never be trusted from a browser-submitted "success" flag alone.
export async function verifyRazorpaySignature({ orderId, paymentId, signature, keySecret }) {
  const expected = await hmacHex(`${orderId}|${paymentId}`, keySecret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
