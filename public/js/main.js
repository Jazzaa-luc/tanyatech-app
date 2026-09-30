/* TanyaTech — customer storefront logic */

const CART_KEY = 'tanyatech_cart_v1';
let products = [];
let categories = [];
let config = { cliqAlias: 'TANYATECH3D', minOrderJD: 10 };
let cart = [];
let svcImageFile = null;
let invoiceImageFile = null;

/* ---------- helpers ---------- */
function fmtJD(n) { return (Math.round(n * 100) / 100).toFixed(2) + ' JD'; }
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
    document.getElementById('cliqAliasDisplay').textContent = config.cliqAlias;
    document.getElementById('minOrderStat').querySelector('.n').textContent = config.minOrderJD.toFixed(0) + ' JD';
  } catch (e) { /* keep defaults */ }
}
async function loadCategories() {
  categories = await (await fetch('/api/categories')).json();
  const panel = document.getElementById('catDropdown');
  const sel = document.getElementById('categoryFilter');
  panel.innerHTML = `<button class="navdrop-item" onclick="filterAndGo('all')">All products</button>` +
    categories.map(c => `<button class="navdrop-item" onclick="filterAndGo('${escHtml(c)}')">${escHtml(c)}</button>`).join('');
  sel.innerHTML = `<option value="all">All categories</option>` +
    categories.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  sel.addEventListener('change', renderProducts);
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
    grid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">No products in this category yet.</div>`;
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
        <button class="btn small accent" onclick="addToCart('${p.id}')">Add to cart</button>
      </div>
    </div>
  `).join('');
  initReveal();
}
function placeholderFor(p) {
  const hex = (p.colors[0] && p.colors[0].hex) || '#55608A';
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
  toast(p.name + ' added to cart');
  openCart();
}
function renderCart() {
  const body = document.getElementById('cartBody');
  if (!cart.length) {
    body.innerHTML = `<div class="empty-note">Your cart is empty. Browse products to add something.</div>`;
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
              <button class="rm-line" onclick="removeFromCart(${idx})">Remove</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }
  const sub = cartSubtotal();
  document.getElementById('cartSubtotal').textContent = fmtJD(sub);
  const belowMin = sub > 0 && sub < config.minOrderJD;
  const note = document.getElementById('minOrderNote');
  note.classList.toggle('hide', !belowMin);
  if (belowMin) note.textContent = `Minimum order is ${config.minOrderJD.toFixed(2)} JD — add ${fmtJD(config.minOrderJD - sub)} more.`;
  document.getElementById('checkoutBtn').disabled = cart.length === 0 || sub < config.minOrderJD;
}
function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(); renderCart();
}
function removeFromCart(idx) { cart.splice(idx, 1); saveCart(); renderCart(); }
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
    document.getElementById('payAmount').textContent = fmtJD(cartSubtotal());
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

async function placeOrder() {
  if (!invoiceImageFile) return;
  const phone = document.getElementById('orderPhone').value.trim();
  const items = cart.map(item => ({ productId: item.productId, color: item.color, qty: item.qty }));
  const btn = document.getElementById('placeOrderBtn');
  setBtnLoading(btn, true);

  const fd = new FormData();
  fd.append('phone', phone);
  fd.append('items', JSON.stringify(items));
  fd.append('invoiceImage', invoiceImageFile);

  try {
    const res = await fetch('/api/orders', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Could not place order'); setBtnLoading(btn, false, 'Place order'); return; }

    cart = [];
    saveCart();
    document.getElementById('confirmOrderId').textContent = data.order.id;
    goCheckoutStep(4);
    window.open(data.whatsapp, '_blank');
    document.getElementById('orderPhone').value = '';
    clearInvoiceImage();
  } catch (e) {
    toast('Network error — please try again');
  } finally {
    setBtnLoading(btn, false, 'Place order');
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
    if (!res.ok) { toast(data.error || 'Could not send request'); return; }
    toast('Request sent — opening WhatsApp');
    window.open(data.whatsapp, '_blank');
    document.getElementById('customForm').reset();
    clearSvcImage();
  } catch (err) {
    toast('Network error — please try again');
  } finally {
    setBtnLoading(btn, false, 'Send request');
  }
});

/* ---------- overlay click-to-close ---------- */
document.getElementById('overlay').addEventListener('click', () => { closeCart(); closeCheckout(); });

/* ---------- init ---------- */
async function init() {
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
