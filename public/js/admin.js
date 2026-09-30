/* TanyaTech — admin dashboard logic */

let categories = [];
let products = [];
let orderStatusFilter = 'all';
let editingProductId = null;
let tempColors = [];
let existingImages = [];   // image URLs already on the product (edit mode)
let newImageFiles = [];    // newly selected File objects

function escHtml(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtJD(n) { return (Math.round(n * 100) / 100).toFixed(2) + ' JD'; }
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

/* ---------- theme ---------- */
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

/* ---------- auth ---------- */
async function checkSession() {
  const res = await fetch('/api/admin/session');
  const data = await res.json();
  if (data.isAdmin) {
    document.getElementById('loginScreen').classList.add('hide');
    document.getElementById('adminApp').classList.remove('hide');
    boot();
  } else {
    document.getElementById('loginScreen').classList.remove('hide');
    document.getElementById('adminApp').classList.add('hide');
  }
}
async function login() {
  const password = document.getElementById('pinInput').value;
  const btn = document.getElementById('loginBtn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password })
    });
    if (res.ok) {
      document.getElementById('loginError').classList.add('hide');
      document.getElementById('loginScreen').classList.add('hide');
      document.getElementById('adminApp').classList.remove('hide');
      boot();
    } else {
      document.getElementById('loginError').classList.remove('hide');
      const card = document.getElementById('loginCard');
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    }
  } finally {
    setBtnLoading(btn, false, 'Sign in');
  }
}
async function logout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  document.getElementById('adminApp').classList.add('hide');
  document.getElementById('loginScreen').classList.remove('hide');
  document.getElementById('pinInput').value = '';
}

/* ---------- tabs ---------- */
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('panelOrders').classList.toggle('active', tab === 'orders');
  document.getElementById('panelCustom').classList.toggle('active', tab === 'custom');
  document.getElementById('panelProducts').classList.toggle('active', tab === 'products');
}

/* ---------- orders ---------- */
function setOrderFilter(f) {
  orderStatusFilter = f;
  document.querySelectorAll('#orderStatusTabs .status-chip').forEach(b => b.classList.toggle('active', b.dataset.status === f));
  renderAdminOrders();
}
let allOrders = [];
async function loadOrders() {
  allOrders = await (await fetch('/api/admin/orders')).json();
  renderAdminOrders();
}
function renderAdminOrders() {
  const list = document.getElementById('ordersList');
  const orders = allOrders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter);
  const pendingCount = allOrders.filter(o => o.status === 'pending').length;
  document.getElementById('ordersBadge').textContent = pendingCount;
  document.getElementById('ordersBadge').classList.toggle('hide', pendingCount === 0);

  if (!orders.length) { list.innerHTML = `<div class="empty-note">No orders here yet.</div>`; return; }
  list.innerHTML = orders.map(o => `
    <div class="plate order-card">
      <div class="order-top">
        <div>
          <span class="order-id">${o.id}</span>
          <div style="font-size:.85rem;margin-top:4px;">Customer: <span class="mono">${escHtml(o.phone)}</span></div>
        </div>
        <span class="badge-status ${o.status}">${o.status}</span>
      </div>
      <div class="order-items">${o.items.map(i => `${i.qty}× ${escHtml(i.name)}${i.color ? ' (' + escHtml(i.color) + ')' : ''} — ${fmtJD(i.price * i.qty)}`).join('<br>')}</div>
      <div class="order-foot">
        <div>
          <span class="price">${fmtJD(o.total)}</span>
          ${o.invoiceImage ? `<button class="shot-link" onclick="showLightbox('${o.invoiceImage}')" style="margin-left:12px;">View payment screenshot</button>` : ''}
        </div>
        <div class="admin-actions">
          <button class="btn small teal" onclick="setOrderStatus('${o.id}','approved')">Approve</button>
          <button class="btn small danger-o" onclick="setOrderStatus('${o.id}','rejected')">Reject</button>
          <button class="btn small ghost" onclick="messageOrderWhatsApp('${o.id}')">Message on WhatsApp</button>
        </div>
      </div>
    </div>
  `).join('');
}
async function setOrderStatus(id, status) {
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
  });
  if (res.ok) { toast('Order ' + id + ' marked ' + status); loadOrders(); }
}
async function messageOrderWhatsApp(id) {
  const res = await fetch(`/api/admin/orders/${id}/whatsapp`);
  const data = await res.json();
  if (data.url) window.open(data.url, '_blank');
}

/* ---------- custom requests ---------- */
let allRequests = [];
async function loadCustomRequests() {
  allRequests = await (await fetch('/api/admin/custom-requests')).json();
  renderAdminCustom();
}
function renderAdminCustom() {
  const list = document.getElementById('customList');
  const newCount = allRequests.filter(r => r.status === 'new').length;
  document.getElementById('customBadge').textContent = newCount;
  document.getElementById('customBadge').classList.toggle('hide', newCount === 0);

  if (!allRequests.length) { list.innerHTML = `<div class="empty-note">No custom requests yet.</div>`; return; }
  list.innerHTML = allRequests.map(r => `
    <div class="plate order-card">
      <div class="order-top">
        <div>
          <span class="order-id">${r.id}</span>
          <div style="font-size:.85rem;margin-top:4px;">Customer: <span class="mono">${escHtml(r.phone)}</span></div>
        </div>
        <span class="badge-status ${r.status}">${r.status}</span>
      </div>
      <div class="order-items" style="margin-top:10px;">${escHtml(r.description)}</div>
      ${r.image ? `<button class="shot-link" style="margin-top:8px;" onclick="showLightbox('${r.image}')">View reference image</button>` : ''}
      <div class="order-foot">
        <div></div>
        <div class="admin-actions">
          <button class="btn small ghost" onclick="markCustomStatus('${r.id}','contacted')">Mark contacted</button>
          <button class="btn small teal" onclick="messageCustomWhatsApp('${r.id}')">Message on WhatsApp</button>
        </div>
      </div>
    </div>
  `).join('');
}
async function markCustomStatus(id, status) {
  const res = await fetch(`/api/admin/custom-requests/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
  });
  if (res.ok) loadCustomRequests();
}
async function messageCustomWhatsApp(id) {
  const res = await fetch(`/api/admin/custom-requests/${id}/whatsapp`);
  const data = await res.json();
  if (data.url) window.open(data.url, '_blank');
}

/* ---------- products ---------- */
async function loadCategories() {
  categories = await (await fetch('/api/categories')).json();
}
async function loadProducts() {
  products = await (await fetch('/api/products')).json();
  renderAdminProducts();
}
function renderAdminProducts() {
  const tbody = document.getElementById('adminProductsTbody');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-note">No products yet — add your first one.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img class="prod-thumb-sm" src="${p.images[0] || ''}"></td>
      <td>${escHtml(p.name)}</td>
      <td class="mono" style="font-size:.78rem;">${escHtml(p.category)}</td>
      <td><div class="color-dot-row">${p.colors.map(c => `<span class="color-dot" style="background:${c.hex}" title="${escHtml(c.name)}"></span>`).join('')}</div></td>
      <td class="price">${fmtJD(p.price)}</td>
      <td>
        <div class="admin-actions">
          <button class="btn small ghost" onclick="openProductModal('${p.id}')">Edit</button>
          <button class="btn small danger-o" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}
async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  if (res.ok) { toast('Product deleted'); loadProducts(); }
}

function populateCategorySelect() {
  const sel = document.getElementById('prodCategory');
  sel.innerHTML = categories.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
}
function openProductModal(id) {
  editingProductId = id || null;
  populateCategorySelect();
  tempColors = [];
  existingImages = [];
  newImageFiles = [];
  document.getElementById('prodNewCategory').value = '';
  document.getElementById('productForm').reset();

  if (id) {
    const p = products.find(x => x.id === id);
    document.getElementById('productModalTitle').textContent = 'Edit product';
    document.getElementById('prodId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodCategory').value = p.category;
    document.getElementById('prodDesc').value = p.description;
    document.getElementById('prodPrice').value = p.price;
    tempColors = p.colors.map(c => ({ ...c }));
    existingImages = [...p.images];
  } else {
    document.getElementById('productModalTitle').textContent = 'Add product';
    document.getElementById('prodId').value = '';
  }
  renderColorChips();
  renderProdImgPreview();
  document.getElementById('productModal').classList.add('show');
}
function closeProductModal() { document.getElementById('productModal').classList.remove('show'); }

function addColorChip() {
  const name = document.getElementById('colorName').value.trim();
  const hex = document.getElementById('colorHex').value;
  if (!name) return;
  tempColors.push({ name, hex });
  document.getElementById('colorName').value = '';
  renderColorChips();
}
function renderColorChips() {
  document.getElementById('colorChips').innerHTML = tempColors.map((c, i) => `
    <div class="color-chip"><span class="sw" style="background:${c.hex}"></span>${escHtml(c.name)}<button type="button" onclick="removeColorChip(${i})">✕</button></div>
  `).join('');
}
function removeColorChip(i) { tempColors.splice(i, 1); renderColorChips(); }

document.getElementById('prodImgInput').addEventListener('change', (e) => {
  newImageFiles.push(...Array.from(e.target.files));
  renderProdImgPreview();
});
function renderProdImgPreview() {
  const wrap = document.getElementById('prodImgPreview');
  wrap.innerHTML = '';
  existingImages.forEach((url, i) => {
    const div = document.createElement('div');
    div.className = 'upload-thumb';
    div.innerHTML = `<img src="${url}"><button type="button" class="rm">✕</button>`;
    div.querySelector('.rm').onclick = () => { existingImages.splice(i, 1); renderProdImgPreview(); };
    wrap.appendChild(div);
  });
  newImageFiles.forEach((file, i) => {
    const div = document.createElement('div');
    div.className = 'upload-thumb';
    const img = document.createElement('img');
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.readAsDataURL(file);
    div.appendChild(img);
    const rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'rm'; rm.textContent = '✕';
    rm.onclick = () => { newImageFiles.splice(i, 1); renderProdImgPreview(); };
    div.appendChild(rm);
    wrap.appendChild(div);
  });
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('prodName').value.trim();
  const newCategory = document.getElementById('prodNewCategory').value.trim();
  const category = document.getElementById('prodCategory').value;
  const description = document.getElementById('prodDesc').value.trim();
  const price = document.getElementById('prodPrice').value;
  const btn = document.getElementById('saveProductBtn');
  setBtnLoading(btn, true);

  const fd = new FormData();
  fd.append('name', name);
  fd.append('category', category);
  fd.append('newCategory', newCategory);
  fd.append('description', description);
  fd.append('price', price);
  fd.append('colors', JSON.stringify(tempColors));
  if (editingProductId) fd.append('keepImages', JSON.stringify(existingImages));
  newImageFiles.forEach(f => fd.append('images', f));

  try {
    const url = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products';
    const method = editingProductId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: fd });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Could not save product'); return; }
    toast(editingProductId ? 'Product updated' : 'Product added');
    closeProductModal();
    await loadCategories();
    await loadProducts();
  } catch (err) {
    toast('Network error — please try again');
  } finally {
    setBtnLoading(btn, false, 'Save product');
  }
});

/* ---------- lightbox ---------- */
function showLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('show');
}
function closeLightbox(e) {
  if (e && e.target.closest('img')) return;
  document.getElementById('lightbox').classList.remove('show');
}

/* ---------- boot ---------- */
async function boot() {
  await loadCategories();
  await loadProducts();
  await loadOrders();
  await loadCustomRequests();
}

const savedTheme = localStorage.getItem('tanyatech_theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
renderThemeIcon();
document.getElementById('themeBtn').addEventListener('click', toggleTheme);
checkSession();
