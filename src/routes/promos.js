const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const round2 = n => Math.round(n * 100) / 100;
const normCode = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

function getPromos(state) {
  if (!state.promoCodes) state.promoCodes = [];
  return state.promoCodes;
}

// Checks a code against a subtotal. Returns { promo, discount } or { error }.
// Shared by the "apply code" endpoint and by order placement so both agree.
function evaluatePromo(state, rawCode, subtotal) {
  const code = normCode(rawCode);
  if (!code) return { error: 'Enter a promo code' };
  const promo = getPromos(state).find(p => p.code === code);
  if (!promo || !promo.active) return { error: 'This promo code is not valid' };
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) return { error: 'This promo code has expired' };
  if (promo.maxUses && promo.uses >= promo.maxUses) return { error: 'This promo code has reached its usage limit' };
  if (promo.minOrder && subtotal < promo.minOrder) return { error: `This code needs an order of at least ${promo.minOrder.toFixed(2)} JD` };

  let discount = promo.type === 'percent' ? subtotal * (promo.value / 100) : promo.value;
  discount = round2(Math.min(discount, subtotal));
  return { promo, discount };
}

// ---- public: check a code against the cart ----
router.post('/promo/validate', (req, res) => {
  const state = db.load();
  const { code, items } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your cart is empty' });

  let subtotal = 0;
  for (const item of items) {
    const product = state.products.find(p => p.id === item.productId);
    if (!product) continue;
    subtotal += product.price * Math.max(1, parseInt(item.qty, 10) || 1);
  }
  subtotal = round2(subtotal);

  const result = evaluatePromo(state, code, subtotal);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    code: result.promo.code,
    type: result.promo.type,
    value: result.promo.value,
    subtotal,
    discount: result.discount,
    total: round2(subtotal - result.discount)
  });
});

// ---- admin: manage codes ----
router.get('/admin/promos', requireAdmin, (req, res) => {
  res.json(getPromos(db.load()));
});

router.post('/admin/promos', requireAdmin, (req, res) => {
  const state = db.load();
  const promos = getPromos(state);
  const parsed = parsePromoBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  if (promos.some(p => p.code === parsed.data.code)) return res.status(400).json({ error: 'That code already exists' });

  const promo = { id: db.uuid(), ...parsed.data, active: true, uses: 0, createdAt: new Date().toISOString() };
  promos.unshift(promo);
  db.persist();
  res.status(201).json(promo);
});

router.patch('/admin/promos/:id', requireAdmin, (req, res) => {
  const state = db.load();
  const promo = getPromos(state).find(p => p.id === req.params.id);
  if (!promo) return res.status(404).json({ error: 'Promo code not found' });
  if (typeof req.body.active === 'boolean') promo.active = req.body.active;
  db.persist();
  res.json(promo);
});

router.delete('/admin/promos/:id', requireAdmin, (req, res) => {
  const state = db.load();
  const promos = getPromos(state);
  const idx = promos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Promo code not found' });
  promos.splice(idx, 1);
  db.persist();
  res.json({ ok: true });
});

function parsePromoBody(body) {
  const code = normCode(body.code);
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return { error: 'Code must be 3-20 letters or numbers' };
  if (!['percent', 'fixed'].includes(body.type)) return { error: 'Choose percent or fixed amount' };
  const value = parseFloat(body.value);
  if (!(value > 0)) return { error: 'Discount value must be greater than 0' };
  if (body.type === 'percent' && value > 100) return { error: 'Percent discount cannot exceed 100' };

  const minOrder = body.minOrder === '' || body.minOrder == null ? 0 : parseFloat(body.minOrder);
  if (isNaN(minOrder) || minOrder < 0) return { error: 'Minimum order is not valid' };
  const maxUses = body.maxUses === '' || body.maxUses == null ? 0 : parseInt(body.maxUses, 10);
  if (isNaN(maxUses) || maxUses < 0) return { error: 'Usage limit is not valid' };

  let expiresAt = null;
  if (body.expiresAt) {
    // Valid through the end of the chosen day.
    const d = new Date(body.expiresAt + 'T23:59:59');
    if (isNaN(d.getTime())) return { error: 'Expiry date is not valid' };
    expiresAt = d.toISOString();
  }
  return { data: { code, type: body.type, value: round2(value), minOrder: round2(minOrder), maxUses, expiresAt } };
}

module.exports = router;
module.exports.evaluatePromo = evaluatePromo;
