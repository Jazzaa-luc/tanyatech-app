/* TanyaTech — customer storefront logic */

const CART_KEY = 'tanyatech_cart_v1';
let products = [];
let categories = [];
let config = { cliqAlias: 'TANYATECH3D', minOrderJD: 10, freeDeliveryJD: 30 };
let cart = [];
let svcImageFile = null;
let invoiceImageFile = null;
let appliedPromo = null; // { code, discount, total } once a code is accepted

/* ---------- helpers ---------- */
function fmtJD(n) { return fmtMoney(n); } // from i18n.js: JD in English, د.أ in Arabic
function escHtml(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2800);
}
function setBtnLoading(btn, loading, labelWhenIdle) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
  } else {
    btn.disabled = false;
    btn.textContent = labelWhenIdle || btn.dataset.label || btn.textContent;
  }
}

/* ---------- nav / theme ---------- */
function goTo(id) {
  document.getElementById('mobileNavPanel').classList.add('hide');
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// "delivery & returns policy" links: close the checkout and cart, then scroll to the policy section
function goPolicy(e) {
  if (e) e.preventDefault();
  closeCheckout(); closeCart();
  goTo('policy');
}
function toggleMobileNav() {
  document.getElementById('mobileNavPanel').classList.toggle('hide');
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tanyatech_theme', next);
  renderThemeIcon();
}
function renderThemeIcon() {
  const btn = document.getElementById('themeBtn');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  btn.innerHTML = isDark
    ? '<svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M16 11.5A6.5 6.5 0 0 1 8.5 4 6.5 6.5 0 1 0 16 11.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 20 20" width="16" height="16" fill="none"><circle cx="10" cy="10" r="3.6" stroke="currentColor" stroke-width="1.4"/><path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4M15.5 15.5l-1.4-1.4M5.9 5.9 4.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
}

/* ---------- scroll-reveal ---------- */
function initReveal() {
  const targets = document.querySelectorAll('.plate.stat, .pcard, .contact-line');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('reveal', 'in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  targets.forEach(t => { t.classList.add('reveal'); io.observe(t); });
}

/* ---------- data loading ---------- */
async function loadConfig() {
  try {
    config = await (await fetch('/api/config')).json();
  } catch (e) { /* keep defaults */ }
  renderConfigUi();
}
function renderConfigUi() {
  document.getElementById('cliqAliasDisplay').textContent = config.cliqAlias;
  document.getElementById('minOrderStat').querySelector('.n').textContent = config.minOrderJD.toFixed(0) + ' ' + t('cur');
  const free = fmtJD(config.freeDeliveryJD);
  document.getElementById('heroDeliveryText').textContent = t('hero.delivery', { min: free });
  document.getElementById('policyDelivery').textContent = t('policy.delBody', { min: free });
}
async function loadCategories() {
  categories = await (await fetch('/api/categories')).json();
  renderCategoryUi();
  document.getElementById('categoryFilter').addEventListener('change', renderProducts);
}
function renderCategoryUi() {
  const panel = document.getElementById('catDropdown');
  const sel = document.getElementById('categoryFilter');
  const keep = sel.value || 'all';
  panel.innerHTML = `<button class="navdrop-item" onclick="filterAndGo('all')">${t('prod.allProducts')}</button>` +
    categories.map(c => `<button class="navdrop-item" onclick="filterAndGo('${escHtml(c)}')">${escHtml(c)}</button>`).join('');
  sel.innerHTML = `<option value="all">${t('prod.allCats')}</option>` +
    categories.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  sel.value = keep;
}
async function loadProducts() {
  products = await (await fetch('/api/products')).json();
  renderProducts();
}
function filterAndGo(cat) {
  document.getElementById('categoryFilter').value = cat;
  renderProducts();
  goTo('products');
}

function renderProducts() {
  const cat = document.getElementById('categoryFilter').value;
  const grid = document.getElementById('productGrid');
  const list = products.filter(p => cat === 'all' || p.category === cat);
  if (!list.length) {
    grid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">${t('prod.empty')}</div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="plate pcard">
      <div class="thumb"><img src="${p.images[0] || placeholderFor(p)}" alt="${escHtml(p.name)}" loading="lazy"></div>
      <div class="cat mono">${escHtml(p.category)}</div>
      <h3>${escHtml(p.name)}</h3>
      <p class="desc">${escHtml(p.description)}</p>
      <div class="swatches">${p.colors.map(c => `<span class="swatch" style="background:${c.hex}" title="${escHtml(c.name)}"></span>`).join('')}</div>
      <div class="pcard-foot">
        <span class="price">${fmtJD(p.price)}</span>
        <button class="btn small accent" onclick="addToCart('${p.id}')">${t('prod.add')}</button>
      </div>
    </div>
  `).join('');
  initReveal();
}
function placeholderFor(p) {
  const hex = (p.colors[0] && p.colors[0].hex) || '#2860C0';
  const label = p.name.slice(0, 12).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="${hex}"/><polygon points="150,60 225,100 225,200 150,240 75,200 75,100" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="3"/><text x="150" y="272" font-family="monospace" font-size="15" fill="rgba(255,255,255,.85)" text-anchor="middle">${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ---------- cart ---------- */
function loadCart() { try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; } }
function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCartCount(); }
function renderCartCount() {
  const n = cart.reduce((s, c) => s + c.qty, 0);
  const el = document.getElementById('cartCount');
  el.textContent = n;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function cartSubtotal() {
  return cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}
function addToCart(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  const color = p.colors[0] ? p.colors[0].name : null;
  const existing = cart.find(c => c.productId === productId && c.color === color);
  if (existing) existing.qty += 1;
  else cart.push({ productId, color, qty: 1 });
  saveCart();
  toast(t('prod.added', { name: p.name }));
  openCart();
  revalidatePromo();
}
function renderCart() {
  const body = document.getElementById('cartBody');
  if (!cart.length) {
    body.innerHTML = `<div class="empty-note">${t('cart.empty')}</div>`;
  } else {
    body.innerHTML = cart.map((item, idx) => {
      const p = products.find(x => x.id === item.productId);
      if (!p) return '';
      return `
        <div class="cart-row">
          <div class="thumb"><img src="${p.images[0] || placeholderFor(p)}"></div>
          <div class="info">
            <h4>${escHtml(p.name)}</h4>
            <div class="meta">${item.color ? escHtml(item.color) + ' · ' : ''}${fmtJD(p.price)}</div>
            <div class="qty-ctrl">
              <button onclick="changeQty(${idx}, -1)">−</button>
              <span class="n">${item.qty}</span>
              <button onclick="changeQty(${idx}, 1)">+</button>
              <button class="rm-line" onclick="removeFromCart(${idx})">${t('cart.remove')}</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }
  const sub = cartSubtotal();
  document.getElementById('cartSubtotal').textContent = fmtJD(sub);
  renderPromoTotals();
  const belowMin = sub > 0 && sub < config.minOrderJD;
  const note = document.getElementById('minOrderNote');
  note.classList.toggle('hide', !belowMin);
  if (belowMin) note.textContent = t('cart.minNote', { min: fmtJD(config.minOrderJD), more: fmtJD(config.minOrderJD - sub) });
  document.getElementById('checkoutBtn').disabled = cart.length === 0 || sub < config.minOrderJD;

  // free delivery is judged on the amount actually paid (after any promo code)
  const pay = cartTotal();
  const hasItems = cart.length > 0 && sub > 0;
  const isFree = hasItems && pay >= config.freeDeliveryJD;
  document.getElementById('deliveryRow').classList.toggle('hide', !isFree);
  const dn = document.getElementById('deliveryNote');
  dn.classList.toggle('hide', !hasItems || isFree);
  if (hasItems && !isFree) dn.textContent = t('cart.deliveryNote', { more: fmtJD(config.freeDeliveryJD - pay) });
}
/* ---------- promo codes ---------- */
function cartItemsPayload() {
  return cart.map(item => ({ productId: item.productId, color: item.color, qty: item.qty }));
}
// Amount the customer actually pays (after any applied promo).
function cartTotal() {
  return appliedPromo ? Math.max(0, cartSubtotal() - appliedPromo.discount) : cartSubtotal();
}
function renderPromoTotals() {
  const has = !!appliedPromo;
  document.getElementById('discountRow').classList.toggle('hide', !has);
  document.getElementById('totalRow').classList.toggle('hide', !has);
  if (has) {
    document.getElementById('discountLabel').textContent = t('cart.promoLabel', { code: appliedPromo.code });
    document.getElementById('cartDiscount').textContent = fmtMoney(appliedPromo.discount, '-');
    document.getElementById('cartTotal').textContent = fmtJD(cartTotal());
  }
}
// The message is remembered as a key (not finished text) so it can be re-translated when the language changes.
let promoMsgState = null; // { key, vars, ok } | { raw, ok } | null
function setPromoMsg(spec, ok) {
  promoMsgState = spec ? Object.assign({ ok: !!ok }, spec) : null;
  renderPromoMsg();
}
function renderPromoMsg() {
  const el = document.getElementById('promoMsg');
  const st = promoMsgState;
  // vars may hold functions so money is formatted in the current language at draw time
  const vars = st && st.vars ? Object.fromEntries(Object.entries(st.vars).map(([k, v]) => [k, typeof v === 'function' ? v() : v])) : null;
  const text = !st ? '' : (st.key ? t(st.key, vars) : st.raw);
  el.textContent = text;
  el.classList.toggle('hide', !text);
  el.classList.toggle('ok', !!(st && st.ok));
}
function promoApplied(data) { return { key: 'promo.applied', vars: { code: data.code, amount: () => fmtJD(data.discount) } }; }
async function applyPromo() {
  if (appliedPromo) { removePromo(); return; }
  const code = document.getElementById('promoInput').value.trim();
  if (!code) { setPromoMsg({ key: 'promo.enter' }, false); return; }
  const btn = document.getElementById('promoApplyBtn');
  btn.disabled = true;
  try {
    const res = await fetch('/api/promo/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, items: cartItemsPayload() })
    });
    const data = await res.json();
    if (!res.ok) { setPromoMsg({ raw: tServer(data.error, 'promo.fail') }, false); return; }
    appliedPromo = { code: data.code, discount: data.discount };
    syncPromoUi();
    setPromoMsg(promoApplied(data), true);
    renderCart();
  } catch (e) {
    setPromoMsg({ key: 'err.network' }, false);
  } finally {
    btn.disabled = false;
  }
}
function removePromo() {
  appliedPromo = null;
  document.getElementById('promoInput').value = '';
  syncPromoUi();
  setPromoMsg(null);
  renderCart();
}
function syncPromoUi() {
  const input = document.getElementById('promoInput');
  input.disabled = !!appliedPromo;
  if (appliedPromo) input.value = appliedPromo.code;
  document.getElementById('promoApplyBtn').textContent = appliedPromo ? t('cart.removePromo') : t('cart.apply');
}
// The cart changed, so a previously accepted discount may no longer be right: re-check it quietly.
async function revalidatePromo() {
  if (!appliedPromo) return;
  if (!cart.length) { removePromo(); return; }
  try {
    const res = await fetch('/api/promo/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: appliedPromo.code, items: cartItemsPayload() })
    });
    const data = await res.json();
    if (!res.ok) { removePromo(); setPromoMsg({ raw: tServer(data.error, 'promo.fail') }, false); return; }
    appliedPromo = { code: data.code, discount: data.discount };
    setPromoMsg(promoApplied(data), true);
    renderCart();
  } catch (e) { /* keep showing the last known discount; the server re-checks at order time */ }
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(); renderCart(); revalidatePromo();
}
function removeFromCart(idx) { cart.splice(idx, 1); saveCart(); renderCart(); revalidatePromo(); }
function openCart() {
  renderCart();
  document.getElementById('cartDrawer').classList.add('show');
  document.getElementById('overlay').classList.add('show');
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('show');
  document.getElementById('overlay').classList.remove('show');
}

/* ---------- checkout ---------- */
function openCheckout() {
  if (cart.length === 0 || cartSubtotal() < config.minOrderJD) return;
  document.getElementById('checkoutModal').classList.add('show');
  goCheckoutStep(1);
}
function closeCheckout() { document.getElementById('checkoutModal').classList.remove('show'); }
function goCheckoutStep(n) {
  [1,2,3,4].forEach(i => document.getElementById('checkoutStep' + i).classList.toggle('hide', i !== n));
  [1,2,3].forEach(i => { const d = document.getElementById('dot'+i); if (d) d.classList.toggle('active', i <= n && n < 4); });
  if (n === 2) {
    const phone = document.getElementById('orderPhone').value.trim();
    if (!phone) { goCheckoutStep(1); return; }
    document.getElementById('payAmount').textContent = fmtJD(cartTotal());
  }
}

document.getElementById('invoiceInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  invoiceImageFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('invoicePreview').innerHTML =
      `<div class="upload-thumb"><img src="${reader.result}"><button type="button" class="rm" onclick="clearInvoiceImage()">✕</button></div>`;
    document.getElementById('placeOrderBtn').disabled = false;
  };
  reader.readAsDataURL(file);
});
function clearInvoiceImage() {
  invoiceImageFile = null;
  document.getElementById('invoicePreview').innerHTML = '';
  document.getElementById('placeOrderBtn').disabled = true;
}

let lastOrderId = '';
function renderConfirmBody() {
  const el = document.getElementById('confirmBody');
  if (!el || !lastOrderId) return;
  // order id is wrapped so it stays left-to-right inside Arabic text
  const html = t('co.sentBody', { id: '@@ID@@' });
  el.innerHTML = escHtml(html).replace('@@ID@@', `<span class="mono" dir="ltr">${escHtml(lastOrderId)}</span>`);
}
async function placeOrder() {
  if (!invoiceImageFile) return;
  const phone = document.getElementById('orderPhone').value.trim();
  const items = cartItemsPayload();
  const btn = document.getElementById('placeOrderBtn');
  setBtnLoading(btn, true);

  const fd = new FormData();
  fd.append('phone', phone);
  fd.append('items', JSON.stringify(items));
  if (appliedPromo) fd.append('promoCode', appliedPromo.code);
  fd.append('invoiceImage', invoiceImageFile);

  try {
    const res = await fetch('/api/orders', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { toast(tServer(data.error, 'co.fail')); setBtnLoading(btn, false, t('co.place')); return; }

    cart = [];
    saveCart();
    removePromo();
    lastOrderId = data.order.id;
    renderConfirmBody();
    goCheckoutStep(4);
    window.open(data.whatsapp, '_blank');
    document.getElementById('orderPhone').value = '';
    clearInvoiceImage();
  } catch (e) {
    toast(t('err.network'));
  } finally {
    setBtnLoading(btn, false, t('co.place'));
  }
}

/* ---------- services / custom requests ---------- */
document.getElementById('svcImgInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  svcImageFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('svcImgPreview').innerHTML =
      `<div class="upload-thumb"><img src="${reader.result}"><button type="button" class="rm" onclick="clearSvcImage()">✕</button></div>`;
  };
  reader.readAsDataURL(file);
});
function clearSvcImage() {
  svcImageFile = null;
  document.getElementById('svcImgPreview').innerHTML = '';
}

document.getElementById('customForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('svcPhone').value.trim();
  const description = document.getElementById('svcDesc').value.trim();
  const btn = document.getElementById('svcSubmitBtn');
  setBtnLoading(btn, true);

  const fd = new FormData();
  fd.append('phone', phone);
  fd.append('description', description);
  if (svcImageFile) fd.append('image', svcImageFile);

  try {
    const res = await fetch('/api/custom-requests', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { toast(tServer(data.error, 'err.sendFail')); return; }
    toast(t('svc.sent'));
    window.open(data.whatsapp, '_blank');
    document.getElementById('customForm').reset();
    clearSvcImage();
  } catch (err) {
    toast(t('err.network'));
  } finally {
    setBtnLoading(btn, false, t('svc.send'));
  }
});

/* ---------- overlay click-to-close ---------- */
document.getElementById('overlay').addEventListener('click', () => { closeCart(); closeCheckout(); });

/* ---------- init ---------- */
/* ---------- flying background ---------- */
// Isometric cubes and the logo's "T" drift up the page, tumbling slowly.
const SKY_CUBE = '<svg viewBox="0 0 100 100"><polygon class="ft" points="50,6 94,28 50,50 6,28"/><polygon class="fl" points="6,28 50,50 50,96 6,74"/><polygon class="fr" points="94,28 50,50 50,96 94,74"/></svg>';
const SKY_WIRE = '<svg viewBox="0 0 100 100"><polygon class="fo" points="50,6 94,28 94,74 50,96 6,74 6,28"/><polyline class="fo" points="6,28 50,50 94,28"/><line class="fo" x1="50" y1="50" x2="50" y2="96"/></svg>';
const SKY_T = '<svg viewBox="0 0 100 100"><polygon class="ft" points="8,34 62,20 92,34 38,48"/><polygon class="fl" points="8,34 38,48 38,60 8,46"/><polygon class="fr" points="38,48 92,34 92,46 38,60"/><polygon class="ft" points="34,56 56,48 56,86 34,94"/><polygon class="fr" points="56,48 70,54 70,92 56,86"/></svg>';
function initSky() {
  const layer = document.getElementById('skyLayer');
  if (!layer) return;
  const small = window.innerWidth < 700;
  const count = small ? 9 : 18;
  const shapes = [SKY_CUBE, SKY_CUBE, SKY_WIRE, SKY_T];
  const rnd = (a, b) => a + Math.random() * (b - a);
  let html = '';
  for (let i = 0; i < count; i++) {
    const far = Math.random() < 0.45;              // far ones: small, faint, blurred, slow
    const size = far ? rnd(22, 44) : rnd(48, 96);
    const dur = far ? rnd(34, 52) : rnd(20, 32);
    const shape = shapes[i % shapes.length];
    html += `<div class="flyer${far ? ' blur' : ''}" style="--x:${rnd(-2, 96).toFixed(1)}%;--s:${size.toFixed(0)}px;--dur:${dur.toFixed(1)}s;--delay:${(-rnd(0, dur)).toFixed(1)}s;--drift:${rnd(-120, 120).toFixed(0)}px;--rot:${rnd(14, 55).toFixed(0)}deg;--spin:${rnd(5, 9).toFixed(1)}s;--o:${(far ? rnd(.18, .3) : rnd(.28, .45)).toFixed(2)};--still:${rnd(5, 90).toFixed(0)}%">${shape}</div>`;
  }
  layer.innerHTML = html;
  // gentle parallax: the whole sky shifts a little as the page scrolls
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { layer.style.transform = `translate3d(0, ${(-window.scrollY * 0.08).toFixed(1)}px, 0)`; ticking = false; });
  }, { passive: true });
}

// Called by i18n.js after the language is switched: redraw everything that was built from JavaScript.
function onLangChange() {
  renderConfigUi();
  renderCategoryUi();
  renderProducts();
  renderCart();
  syncPromoUi();
  renderPromoMsg();
  renderConfirmBody();
  renderLangBtn();
}
function renderLangBtn() {
  const b = document.getElementById('langBtn');
  if (b) b.classList.toggle('is-ar', currentLang === 'ar');
}

async function init() {
  applyI18n();
  initSky();
  const savedTheme = localStorage.getItem('tanyatech_theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  renderThemeIcon();
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.getElementById('yearNow').textContent = new Date().getFullYear();
  loadCart();
  renderCartCount();
  await loadConfig();
  await loadCategories();
  await loadProducts();
  initReveal();
}
init();
