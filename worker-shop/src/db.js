export async function insertOrder(db, order) {
  await db
    .prepare(
      `INSERT INTO orders (
        id, format, quantity, signed, customer_name, customer_email, customer_phone,
        country, address_line, city, state, postal_code,
        subtotal, shipping, total, currency,
        razorpay_order_id, payment_status, digital_fulfillment, physical_fulfillment, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      order.id,
      order.format,
      order.quantity,
      order.signed ? 1 : 0,
      order.customerName,
      order.customerEmail,
      order.customerPhone || null,
      order.country,
      order.addressLine || null,
      order.city || null,
      order.state || null,
      order.postalCode || null,
      order.subtotal,
      order.shipping,
      order.total,
      order.currency,
      order.razorpayOrderId,
      'created',
      null,
      order.format === 'physical' ? null : null,
      Date.now()
    )
    .run();
}

export async function getOrder(db, id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
}

export async function markOrderPaid(db, id, { razorpayPaymentId, digitalFulfillment, physicalFulfillment }) {
  await db
    .prepare(
      `UPDATE orders SET payment_status = 'paid', razorpay_payment_id = ?,
       digital_fulfillment = ?, physical_fulfillment = ? WHERE id = ?`
    )
    .bind(razorpayPaymentId, digitalFulfillment || null, physicalFulfillment || null, id)
    .run();
}

export async function markPdfDownloaded(db, id) {
  await db
    .prepare(`UPDATE orders SET digital_fulfillment = 'Downloaded' WHERE id = ? AND digital_fulfillment = 'Paid'`)
    .bind(id)
    .run();
}

// Atomic-ish decrement: only succeeds while stock remains, so two concurrent
// buyers can't both take the last copy. Returns true if a unit was reserved.
export async function tryReservePhysicalUnit(db) {
  const result = await db
    .prepare('UPDATE inventory SET physical_count = physical_count - 1 WHERE id = 1 AND physical_count > 0')
    .run();
  return (result.meta?.changes || 0) > 0;
}

export async function getPhysicalInventory(db) {
  const row = await db.prepare('SELECT physical_count FROM inventory WHERE id = 1').first();
  return row ? row.physical_count : 0;
}
