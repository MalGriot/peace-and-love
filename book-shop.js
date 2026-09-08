// Book shop: the purchase flow behind every "Get the book" CTA on the
// Poetry page. Talks to the mal-griot-book-shop Cloudflare Worker (see
// worker-shop/) for pricing, order creation, and payment verification —
// this file never decides a price itself, it only displays what the
// worker reports and forwards what the customer typed.
//
// Set this to the deployed worker's URL (see worker-shop/README.md).
// Left pointing at localhost until the worker is deployed for the first
// time; the modal falls back to a friendly "not set up yet" state if it
// can't reach this URL, rather than breaking the page.
var BOOK_SHOP_WORKER_URL = 'https://mal-griot-book-shop.malgriot.workers.dev';

// Manual UPI fallback: shown alongside the Razorpay button while the
// Razorpay account isn't fully activated for live settlement yet. This
// path has no automatic verification — the customer pays this VPA
// directly, then sends proof over WhatsApp for Mal to confirm and fulfill
// by hand. Remove this block (and its markup in renderCheckout) once
// Razorpay is fully live and this stopgap is no longer needed.
var MANUAL_UPI_VPA = 'sumtinels@okhdfcbank';
var MANUAL_UPI_WHATSAPP = '917718816239';

(function () {
  var openButtons = ['book-shop-open', 'book-shop-open-hero']; // element id(s) that open the shop
  var modal = document.getElementById('bshop-modal');
  if (!modal) return;

  var panel = modal.querySelector('.bshop-modal__panel');
  var closeBtn = modal.querySelector('.bshop-modal__close');
  var backdrop = modal.querySelector('.bshop-modal__backdrop');
  var body = modal.querySelector('.bshop-modal__body');

  var config = null;
  var configPromise = null;
  var selectedFormat = null;
  var currentOrder = null; // { orderId, razorpayOrderId, razorpayKeyId, ... }

  function money(rupees) {
    return '₹' + Number(rupees).toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function fetchConfig() {
    if (configPromise) return configPromise;
    configPromise = fetch(BOOK_SHOP_WORKER_URL + '/api/config', { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('bad config response');
        return res.json();
      })
      .then(function (json) {
        config = json;
        return json;
      })
      .catch(function (err) {
        configPromise = null;
        throw err;
      });
    return configPromise;
  }

  function open(e) {
    if (e) e.preventDefault();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    selectedFormat = null;
    currentOrder = null;
    renderLoading();
    fetchConfig()
      .then(function () {
        renderEditions();
      })
      .catch(function () {
        renderUnavailable();
      });
  }

  function close() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function renderLoading() {
    body.innerHTML = '<p class="bshop-loading">Loading editions…</p>';
  }

  function renderUnavailable() {
    body.innerHTML =
      '<span class="bshop-kicker">falling under where</span>' +
      '<h3 class="bshop-title">Purchasing isn’t set up yet</h3>' +
      '<p class="bshop-sub">The shop isn’t connected right now. Reach out directly and Mal will sort you out.</p>' +
      '<a class="po-cta po-cta--solid" href="contact.html">Go to contact</a>';
  }

  function editionRow(key, label, desc, price, enabled) {
    return (
      '<button type="button" class="bshop-edition" data-format="' + key + '"' +
      (enabled ? '' : ' disabled') + '>' +
      '<span><span class="bshop-edition__label">' + label + '</span>' +
      '<span class="bshop-edition__desc">' + desc + (enabled ? '' : ' — sold out') + '</span></span>' +
      '<span class="bshop-edition__price">' + money(price) + '</span>' +
      '</button>'
    );
  }

  function renderEditions() {
    var rows = [];
    if (config.pdf.enabled) {
      rows.push(editionRow('pdf', 'PDF', 'Digital edition · instant delivery', config.pdf.price, true));
    }
    if (config.physical.price != null) {
      rows.push(editionRow('physical', 'Physical', 'Printed edition · ships to you', config.physical.price, config.physical.enabled));
    }
    if (config.bundle.price != null) {
      rows.push(editionRow('bundle', 'PDF + Physical', 'Both editions', config.bundle.price, config.bundle.enabled));
    }

    body.innerHTML =
      '<span class="bshop-kicker">' + escapeHtml(config.bookTitle) + '</span>' +
      '<h3 class="bshop-title">Choose your edition.</h3>' +
      '<div class="bshop-editions">' + rows.join('') + '</div>';

    Array.prototype.forEach.call(body.querySelectorAll('.bshop-edition:not([disabled])'), function (btn) {
      btn.addEventListener('click', function () {
        selectedFormat = btn.getAttribute('data-format');
        renderCheckout();
      });
    });
  }

  function fieldHtml(id, label, type, half) {
    type = type || 'text';
    return (
      '<div class="bshop-field' + (half ? '' : '') + '">' +
      '<label for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" name="' + id + '" type="' + type + '" required>' +
      '</div>'
    );
  }

  function renderCheckout() {
    var isPdf = selectedFormat === 'pdf';
    var isPhysical = selectedFormat === 'physical';
    var isBundle = selectedFormat === 'bundle';
    var wantsShipping = isPhysical || isBundle;
    var editionLabel = isPdf ? 'PDF' : isBundle ? 'PDF + Physical' : 'Physical';
    var basePrice = isPdf ? config.pdf.price : isBundle ? config.bundle.price : config.physical.price;

    var fields =
      fieldHtml('bshop-name', 'Full name', 'text') +
      fieldHtml('bshop-email', 'Email', 'email') +
      (wantsShipping ? fieldHtml('bshop-phone', 'Phone', 'tel') : '');

    if (wantsShipping) {
      fields +=
        fieldHtml('bshop-address', 'Shipping address', 'text') +
        '<div class="bshop-row2">' + fieldHtml('bshop-city', 'City', 'text') + fieldHtml('bshop-state', 'State / Province', 'text') + '</div>' +
        '<div class="bshop-row2">' + fieldHtml('bshop-postal', 'PIN / postal code', 'text') + fieldHtml('bshop-country', 'Country', 'text') + '</div>';
    } else {
      fields += fieldHtml('bshop-country', 'Country', 'text');
    }

    var signedRow = '';
    if (wantsShipping && config.signedCopies && config.signedCopies.enabled) {
      signedRow =
        '<label class="bshop-signed"><input type="checkbox" id="bshop-signed">' +
        'Signed copy (+' + money(config.signedCopies.price) + ')</label>';
    }

    body.innerHTML =
      '<button type="button" class="bshop-back">← Back</button>' +
      '<span class="bshop-kicker">' + escapeHtml(config.bookTitle) + ' · ' + editionLabel + '</span>' +
      '<h3 class="bshop-title">Your details</h3>' +
      '<form id="bshop-form">' +
      fields +
      signedRow +
      '<div class="bshop-summary" id="bshop-summary"></div>' +
      '<p class="bshop-error" id="bshop-form-error" style="display:none"></p>' +
      '<button type="submit" class="po-cta po-cta--solid bshop-submit" id="bshop-pay-btn">Pay ' + money(basePrice) + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</form>' +
      '<div class="bshop-upi">' +
      '<p class="bshop-upi__divider">or pay by UPI directly</p>' +
      '<img class="bshop-upi__qr" src="img/book/upi-qr.png" alt="UPI QR code for ' + escapeHtml(MANUAL_UPI_VPA) + '" width="120" height="120">' +
      '<p class="bshop-upi__vpa">Scan and pay <strong id="bshop-upi-amount">' + money(basePrice) + '</strong> to <strong>' + escapeHtml(MANUAL_UPI_VPA) + '</strong></p>' +
      '<p class="bshop-upi__note">This isn\'t verified automatically. After paying, tap below to send your payment screenshot and details over WhatsApp — Mal will confirm and get your book to you personally.</p>' +
      '<a class="po-cta po-cta--ghost bshop-upi__whatsapp" id="bshop-upi-whatsapp" href="#" target="_blank" rel="noopener">Send payment proof on WhatsApp</a>' +
      '</div>';

    body.querySelector('.bshop-back').addEventListener('click', renderEditions);

    var summaryEl = document.getElementById('bshop-summary');
    var payBtn = document.getElementById('bshop-pay-btn');
    var signedBox = document.getElementById('bshop-signed');
    var countryInput = document.getElementById('bshop-country');
    var upiAmountEl = document.getElementById('bshop-upi-amount');
    var upiWhatsappBtn = document.getElementById('bshop-upi-whatsapp');
    var currentTotal = basePrice;

    function refreshUpiWhatsappLink() {
      var name = (document.getElementById('bshop-name') || {}).value || '';
      var email = (document.getElementById('bshop-email') || {}).value || '';
      var message =
        'Hi Mal, I just paid ' + money(currentTotal) + ' via UPI for ' + config.bookTitle + ' (' + editionLabel + ').\n' +
        'Name: ' + name + '\nEmail: ' + email + '\n(attaching payment screenshot)';
      upiWhatsappBtn.href = 'https://wa.me/' + MANUAL_UPI_WHATSAPP + '?text=' + encodeURIComponent(message);
    }

    function refreshSummary() {
      if (!wantsShipping) {
        summaryEl.innerHTML = '';
        payBtn.innerHTML = 'Pay ' + money(basePrice) + payBtn.querySelector('svg').outerHTML;
        currentTotal = basePrice;
        upiAmountEl.textContent = money(currentTotal);
        refreshUpiWhatsappLink();
        return;
      }
      var country = countryInput.value.trim().toLowerCase();
      var shipping = country === 'india' || country === 'in' ? config.physical.indiaShipping : config.physical.internationalShipping;
      var signedAdd = signedBox && signedBox.checked ? config.signedCopies.price : 0;
      var subtotal = basePrice + signedAdd;
      var total = subtotal + shipping;
      summaryEl.innerHTML =
        '<div class="bshop-summary__row"><span>Book</span><span>' + money(subtotal) + '</span></div>' +
        '<div class="bshop-summary__row"><span>Shipping' + (country ? '' : ' (enter country)') + '</span><span>' + money(shipping) + '</span></div>' +
        '<div class="bshop-summary__row bshop-summary__row--total"><span>Total</span><span>' + money(total) + '</span></div>';
      payBtn.innerHTML = 'Pay ' + money(total) + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      currentTotal = total;
      upiAmountEl.textContent = money(currentTotal);
      refreshUpiWhatsappLink();
    }

    if (wantsShipping) {
      countryInput.addEventListener('input', refreshSummary);
      if (signedBox) signedBox.addEventListener('change', refreshSummary);
    }
    document.getElementById('bshop-name').addEventListener('input', refreshUpiWhatsappLink);
    document.getElementById('bshop-email').addEventListener('input', refreshUpiWhatsappLink);
    refreshSummary();

    document.getElementById('bshop-form').addEventListener('submit', function (e) {
      e.preventDefault();
      handleCheckoutSubmit(wantsShipping, signedBox);
    });
  }

  function showFormError(msg) {
    var el = document.getElementById('bshop-form-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  function handleCheckoutSubmit(wantsShipping, signedBox) {
    var customer = {
      name: document.getElementById('bshop-name').value,
      email: document.getElementById('bshop-email').value,
      country: document.getElementById('bshop-country').value,
    };
    if (wantsShipping) {
      customer.phone = document.getElementById('bshop-phone').value;
      customer.addressLine = document.getElementById('bshop-address').value;
      customer.city = document.getElementById('bshop-city').value;
      customer.state = document.getElementById('bshop-state').value;
      customer.postalCode = document.getElementById('bshop-postal').value;
    }
    var signed = !!(signedBox && signedBox.checked);

    var payBtn = document.getElementById('bshop-pay-btn');
    payBtn.disabled = true;
    var originalHtml = payBtn.innerHTML;
    payBtn.textContent = 'Starting payment…';

    fetch(BOOK_SHOP_WORKER_URL + '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: selectedFormat, customer: customer, signed: signed }),
    })
      .then(function (res) {
        return res.json().then(function (json) {
          if (!res.ok) throw new Error(json.error || 'Could not start payment');
          return json;
        });
      })
      .then(function (order) {
        currentOrder = order;
        loadRazorpayScript()
          .then(function () {
            openRazorpay(order);
          })
          .catch(function () {
            payBtn.disabled = false;
            payBtn.innerHTML = originalHtml;
            showFormError('Could not load the payment window. Check your connection and try again.');
          });
      })
      .catch(function (err) {
        payBtn.disabled = false;
        payBtn.innerHTML = originalHtml;
        showFormError(err.message || 'Something went wrong. Please try again.');
      });
  }

  var razorpayScriptPromise = null;
  function loadRazorpayScript() {
    if (window.Razorpay) return Promise.resolve();
    if (razorpayScriptPromise) return razorpayScriptPromise;
    razorpayScriptPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return razorpayScriptPromise;
  }

  function openRazorpay(order) {
    var rzp = new window.Razorpay({
      key: order.razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Mal Griot',
      description: order.bookTitle,
      order_id: order.razorpayOrderId,
      prefill: { name: order.customerName, email: order.customerEmail },
      theme: { color: '#e0b26a' },
      handler: function (response) {
        renderProcessing();
        verifyPayment(order.orderId, response);
      },
      modal: {
        ondismiss: function () {
          var payBtn = document.getElementById('bshop-pay-btn');
          if (payBtn) {
            payBtn.disabled = false;
            showFormError('Payment was cancelled.');
          }
        },
      },
    });
    rzp.on('payment.failed', function () {
      var payBtn = document.getElementById('bshop-pay-btn');
      if (payBtn) {
        payBtn.disabled = false;
        showFormError('Payment failed. Please try again.');
      }
    });
    rzp.open();
  }

  function renderProcessing() {
    body.innerHTML = '<p class="bshop-loading">Confirming your payment…</p>';
  }

  function verifyPayment(orderId, response) {
    fetch(BOOK_SHOP_WORKER_URL + '/api/orders/' + encodeURIComponent(orderId) + '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      }),
    })
      .then(function (res) {
        return res.json().then(function (json) {
          if (!res.ok) throw new Error(json.error || 'Could not confirm payment');
          return json;
        });
      })
      .then(renderConfirmation)
      .catch(function (err) {
        body.innerHTML =
          '<p class="bshop-error">' + escapeHtml(err.message || 'Could not confirm your payment.') +
          ' If money left your account, contact Mal directly and it will be sorted.</p>' +
          '<a class="po-cta po-cta--solid" href="contact.html">Go to contact</a>';
      });
  }

  function renderConfirmation(result) {
    var isPhysicalOnly = result.format === 'physical';
    var isBundle = result.format === 'bundle';
    var headline = isPhysicalOnly
      ? 'Your copy of ' + result.bookTitle + ' is on its way.'
      : 'Your copy of ' + result.bookTitle + ' is ready.';

    var extra = '';
    if (result.downloadUrl) {
      extra += '<a class="po-cta po-cta--solid" href="' + result.downloadUrl + '">Download your PDF</a>';
    }
    if (isBundle) {
      extra += '<p class="bshop-confirm__note">Your physical copy will be shipped to you.</p>';
    } else if (isPhysicalOnly) {
      extra += '<p class="bshop-confirm__note">You’ll hear from us once it ships.</p>';
    }
    if (result.soldOutNotice) {
      extra += '<p class="bshop-confirm__note">Physical copies just sold out after your payment — Mal will reach out about a refund or restock.</p>';
    }

    body.innerHTML =
      '<div class="bshop-confirm">' +
      '<div class="bshop-confirm__icon">✨</div>' +
      '<p class="bshop-confirm__msg">' + escapeHtml(headline) + '</p>' +
      extra +
      '</div>';
  }

  openButtons.forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', open);
  });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();
