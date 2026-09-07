// Single source of truth for the book product. The server is the only
// place prices, shipping, and availability are decided — the frontend
// fetches GET /api/config to render itself, but never gets to set a price.
export const BOOK_CONFIG = {
  BOOK_TITLE: 'f a l l i n g under where',

  PDF_ENABLED: true,
  PHYSICAL_ENABLED: true,
  BUNDLE_ENABLED: true,

  PDF_PRICE: 299,
  PHYSICAL_PRICE: 799,
  BUNDLE_PRICE: 999,

  PDF_FILE: 'falling-under-where.pdf', // R2 object key inside PDF_BUCKET

  TRACK_INVENTORY: true,
  // Fallback only, used if the D1 `inventory` row is ever missing.
  PHYSICAL_INVENTORY_FALLBACK: 0,

  INDIA_SHIPPING: 80,
  INTERNATIONAL_SHIPPING: 1500,

  SIGNED_COPIES_ENABLED: false,
  SIGNED_COPY_PRICE: 200, // added on top of the physical/bundle price

  CURRENCY: 'INR',
};

export function isIndia(country) {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return c === 'india' || c === 'in';
}

// Computes subtotal/shipping/total server-side from the format + country
// the customer chose. Never derived from anything the browser sends as a
// number — only the format string, the signed flag, and the country name
// are trusted as input, and even those are validated against BOOK_CONFIG's
// enabled flags before use.
export function computeOrderTotals({ format, country, signed }) {
  const cfg = BOOK_CONFIG;
  const wantsPhysical = format === 'physical' || format === 'bundle';
  const wantsSigned = wantsPhysical && cfg.SIGNED_COPIES_ENABLED && !!signed;

  let subtotal;
  if (format === 'pdf') {
    subtotal = cfg.PDF_PRICE;
  } else if (format === 'physical') {
    subtotal = cfg.PHYSICAL_PRICE + (wantsSigned ? cfg.SIGNED_COPY_PRICE : 0);
  } else if (format === 'bundle') {
    subtotal = cfg.BUNDLE_PRICE + (wantsSigned ? cfg.SIGNED_COPY_PRICE : 0);
  } else {
    throw new Error('Invalid format');
  }

  const shipping = wantsPhysical ? (isIndia(country) ? cfg.INDIA_SHIPPING : cfg.INTERNATIONAL_SHIPPING) : 0;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    currency: cfg.CURRENCY,
    signed: wantsSigned,
  };
}

export function formatEnabled(format) {
  const cfg = BOOK_CONFIG;
  if (format === 'pdf') return cfg.PDF_ENABLED;
  if (format === 'physical') return cfg.PHYSICAL_ENABLED;
  if (format === 'bundle') return cfg.BUNDLE_ENABLED;
  return false;
}
