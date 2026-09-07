import { BOOK_CONFIG } from './config.js';

// Email is entirely optional: if RESEND_API_KEY isn't set, this is a no-op
// and the download link still reaches the customer via the confirmation
// screen. Never throws — a failed email must not fail the order.
export async function sendConfirmationEmail(env, { order, downloadUrl }) {
  if (!env.RESEND_API_KEY) return { sent: false, reason: 'not configured' };

  const from = env.RESEND_FROM || 'Mal Griot <onboarding@resend.dev>';
  const isPhysical = order.format === 'physical';
  const isBundle = order.format === 'bundle';

  const lines = [];
  if (isPhysical) {
    lines.push(`Your copy of ${BOOK_CONFIG.BOOK_TITLE} is on its way.`);
    lines.push('We will follow up once it ships.');
  } else {
    lines.push(`Your copy of ${BOOK_CONFIG.BOOK_TITLE} is ready.`);
    if (downloadUrl) lines.push(`Download it here (link expires): ${downloadUrl}`);
    if (isBundle) lines.push('Your physical copy will be shipped to you separately.');
  }

  const html = `<p>Hi ${escapeHtml(order.customer_name)},</p><p>${lines.map(escapeHtml).join('</p><p>')}</p><p>Peace and love,<br>Mal</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: order.customer_email,
        subject: `${BOOK_CONFIG.BOOK_TITLE} — order confirmed`,
        html,
      }),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false, reason: 'send failed' };
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
