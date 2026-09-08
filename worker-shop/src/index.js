import { corsHeaders, isAllowedOrigin } from './cors.js';
import { BOOK_CONFIG, computeOrderTotals, formatEnabled } from './config.js';
import { insertOrder, getOrder, markOrderPaid, markPdfDownloaded, tryReservePhysicalUnit, getPhysicalInventory } from './db.js';
import { createRazorpayOrder, verifyRazorpaySignature } from './razorpay.js';
import { signDownloadToken, verifyDownloadToken } from './tokens.js';
import { sendConfirmationEmail } from './email.js';

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validCustomer(format, customer) {
  if (!customer || typeof customer !== 'object') return 'Missing customer details';
  if (!isNonEmptyString(customer.name)) return 'Name is required';
  if (!isNonEmptyString(customer.email) || !customer.email.includes('@')) return 'A valid email is required';
  if (!isNonEmptyString(customer.country)) return 'Country is required';

  if (format === 'physical' || format === 'bundle') {
    if (!isNonEmptyString(customer.phone)) return 'Phone is required';
    if (!isNonEmptyString(customer.addressLine)) return 'Shipping address is required';
    if (!isNonEmptyString(customer.city)) return 'City is required';
    if (!isNonEmptyString(customer.state)) return 'State/Province is required';
    if (!isNonEmptyString(customer.postalCode)) return 'PIN/postal code is required';
  }
  return null;
}

async function handleGetConfig(env, origin) {
  const physicalCount = BOOK_CONFIG.TRACK_INVENTORY ? await getPhysicalInventory(env.DB) : null;
  const physicalInStock = !BOOK_CONFIG.TRACK_INVENTORY || physicalCount > 0;

  return json(
    {
      bookTitle: BOOK_CONFIG.BOOK_TITLE,
      currency: BOOK_CONFIG.CURRENCY,
      pdf: { enabled: BOOK_CONFIG.PDF_ENABLED, price: BOOK_CONFIG.PDF_PRICE },
      physical: {
        enabled: BOOK_CONFIG.PHYSICAL_ENABLED && physicalInStock,
        price: BOOK_CONFIG.PHYSICAL_PRICE,
        indiaShipping: BOOK_CONFIG.INDIA_SHIPPING,
        internationalShipping: BOOK_CONFIG.INTERNATIONAL_SHIPPING,
      },
      bundle: { enabled: BOOK_CONFIG.BUNDLE_ENABLED && physicalInStock, price: BOOK_CONFIG.BUNDLE_PRICE },
      signedCopies: { enabled: BOOK_CONFIG.SIGNED_COPIES_ENABLED, price: BOOK_CONFIG.SIGNED_COPY_PRICE },
      razorpayKeyId: env.RAZORPAY_KEY_ID || null,
    },
    200,
    origin
  );
}

async function handleCreateOrder(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { format, customer, signed } = body || {};
  if (!['pdf', 'physical', 'bundle'].includes(format)) {
    return json({ error: 'Invalid format' }, 400, origin);
  }
  if (!formatEnabled(format)) {
    return json({ error: 'That edition is not available right now' }, 400, origin);
  }

  const wantsPhysical = format === 'physical' || format === 'bundle';
  if (wantsPhysical && BOOK_CONFIG.TRACK_INVENTORY) {
    const available = await getPhysicalInventory(env.DB);
    if (available <= 0) return json({ error: 'Physical copies are sold out' }, 409, origin);
  }

  const customerError = validCustomer(format, customer);
  if (customerError) return json({ error: customerError }, 400, origin);

  const totals = computeOrderTotals({ format, country: customer.country, signed });
  const orderId = crypto.randomUUID();

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return json({ error: 'Payments are not configured yet' }, 503, origin);
  }

  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      amountInPaise: totals.total * 100,
      currency: totals.currency,
      receipt: orderId,
    });
  } catch (err) {
    return json({ error: 'Could not start payment' }, 502, origin);
  }

  await insertOrder(env.DB, {
    id: orderId,
    format,
    quantity: 1,
    signed: totals.signed,
    customerName: customer.name.trim(),
    customerEmail: customer.email.trim(),
    customerPhone: customer.phone ? customer.phone.trim() : null,
    country: customer.country.trim(),
    addressLine: customer.addressLine ? customer.addressLine.trim() : null,
    city: customer.city ? customer.city.trim() : null,
    state: customer.state ? customer.state.trim() : null,
    postalCode: customer.postalCode ? customer.postalCode.trim() : null,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    currency: totals.currency,
    razorpayOrderId: razorpayOrder.id,
  });

  return json(
    {
      orderId,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: totals.total * 100,
      currency: totals.currency,
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.total,
      bookTitle: BOOK_CONFIG.BOOK_TITLE,
      customerName: customer.name.trim(),
      customerEmail: customer.email.trim(),
    },
    200,
    origin
  );
}

async function handleVerifyPayment(request, env, origin, orderId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { razorpay_payment_id: paymentId, razorpay_order_id: rpOrderId, razorpay_signature: signature } = body || {};
  if (!isNonEmptyString(paymentId) || !isNonEmptyString(rpOrderId) || !isNonEmptyString(signature)) {
    return json({ error: 'Missing payment verification fields' }, 400, origin);
  }

  const order = await getOrder(env.DB, orderId);
  if (!order) return json({ error: 'Order not found' }, 404, origin);
  if (order.razorpay_order_id !== rpOrderId) return json({ error: 'Order mismatch' }, 400, origin);

  if (order.payment_status === 'paid') {
    // Idempotent: a retried verify call for an already-paid order just
    // re-returns its result instead of erroring.
    return json(await buildPaidResponse(env, order), 200, origin);
  }

  const valid = await verifyRazorpaySignature({
    orderId: rpOrderId,
    paymentId,
    signature,
    keySecret: env.RAZORPAY_KEY_SECRET,
  });
  if (!valid) return json({ error: 'Payment could not be verified' }, 400, origin);

  const wantsPhysical = order.format === 'physical' || order.format === 'bundle';
  if (wantsPhysical && BOOK_CONFIG.TRACK_INVENTORY) {
    const reserved = await tryReservePhysicalUnit(env.DB);
    if (!reserved) {
      // Payment succeeded but stock ran out between checkout and payment.
      // Still mark paid (money changed hands) so it's visible for manual
      // follow-up/refund rather than silently dropping the order.
      await markOrderPaid(env.DB, order.id, {
        razorpayPaymentId: paymentId,
        digitalFulfillment: order.format !== 'physical' ? 'Paid' : null,
        physicalFulfillment: 'Cancelled',
      });
      const updated = await getOrder(env.DB, order.id);
      return json(await buildPaidResponse(env, updated, { soldOutNotice: true }), 200, origin);
    }
  }

  await markOrderPaid(env.DB, order.id, {
    razorpayPaymentId: paymentId,
    digitalFulfillment: order.format !== 'physical' ? 'Paid' : null,
    physicalFulfillment: wantsPhysical ? 'Processing' : null,
  });

  const updated = await getOrder(env.DB, order.id);
  const response = await buildPaidResponse(env, updated);
  return json(response, 200, origin);
}

async function buildPaidResponse(env, order, opts = {}) {
  let downloadUrl = null;
  if (order.format === 'pdf' || order.format === 'bundle') {
    const ttlSeconds = Number(env.DOWNLOAD_LINK_TTL_SECONDS || 86400);
    const token = await signDownloadToken({
      orderId: order.id,
      expiresAt: Date.now() + ttlSeconds * 1000,
      secret: env.DOWNLOAD_TOKEN_SECRET,
    });
    downloadUrl = `${env.SELF_URL || ''}/api/download?token=${encodeURIComponent(token)}`;
  }

  sendConfirmationEmail(env, { order, downloadUrl }).catch(() => {});

  return {
    status: 'paid',
    format: order.format,
    bookTitle: BOOK_CONFIG.BOOK_TITLE,
    downloadUrl,
    physicalShipping: order.format === 'physical' || order.format === 'bundle',
    soldOutNotice: !!opts.soldOutNotice,
  };
}

async function handleDownload(request, env, url) {
  const token = url.searchParams.get('token');
  const payload = token ? await verifyDownloadToken(token, env.DOWNLOAD_TOKEN_SECRET) : null;
  if (!payload) return new Response('This download link is invalid or has expired.', { status: 403 });

  const order = await getOrder(env.DB, payload.orderId);
  if (!order || order.payment_status !== 'paid') {
    return new Response('This download link is invalid or has expired.', { status: 403 });
  }
  if (order.format !== 'pdf' && order.format !== 'bundle') {
    return new Response('No digital edition on this order.', { status: 403 });
  }

  const bytes = await env.BOOK_FILES.get(BOOK_CONFIG.PDF_FILE, 'arrayBuffer');
  if (!bytes) return new Response('File temporarily unavailable.', { status: 500 });

  markPdfDownloaded(env.DB, order.id).catch(() => {});

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="falling-under-where.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Download links are opened directly by the browser (no CORS preflight,
    // no Origin check possible/needed) — the signed token is the gate.
    if (url.pathname === '/api/download' && request.method === 'GET') {
      return handleDownload(request, env, url);
    }

    if (!isAllowedOrigin(origin)) {
      return json({ error: 'Origin not allowed' }, 403, origin);
    }

    if (url.pathname === '/api/config' && request.method === 'GET') {
      return handleGetConfig(env, origin);
    }

    if (url.pathname === '/api/orders' && request.method === 'POST') {
      return handleCreateOrder(request, env, origin);
    }

    const verifyMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/verify$/);
    if (verifyMatch && request.method === 'POST') {
      return handleVerifyPayment(request, env, origin, verifyMatch[1]);
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
