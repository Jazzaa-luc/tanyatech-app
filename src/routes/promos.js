const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { wrap, HttpError } = require('../http');

const round2 = n => Math.round(n * 100) / 100;
const normCode = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

// Checks a code against a subtotal. Returns { promo, discount } or { error }.
// Shared by the "apply code" endpoint and by order placement so both agree.
async function evaluatePromo(rawCode, subtotal, q = db.query) {
  const code = normCode(rawCode);
  if (!code) return { error: 'Enter a promo code' };
  const r = await q('SELECT * FROM promo_codes WHERE code = $1', [code]);
  const promo = r.rows[0] && db.mapPromo(r.rows[0]);
  if (!promo || !promo.active) return { error: 'This promo code is not valid' };
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) return { error: 'This promo code has expired' };
  if (promo.maxUses && promo.uses >= promo.maxUses) return { error: 'This promo code has reached its usage limit' };
  if (promo.minOrder && subtotal < promo.minOrder) return { error: `This code needs an order of at least ${promo.minOrder.toFixed(2)} JD` };

  let discount = promo.type === 'percent' ? subtotal * (promo.value / 100) : promo.value;
  discount = round2(Math.min(discount, subtotal));
  return { promo, discount };
}

// ---- public: check a code against the cart ----
router.post('/promo/validate', wrap(async (req, res) => {
  const { code, items } = req.body;
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your cart is empty');

  const prices = new Map((await db.query('SELECT id, price FROM products')).rows.map(p => [p.id, Number(p.price)]));
  let subtotal = 0;
  for (const item of items) {
    if (!prices.has(item.productId)) continue;
    subtotal += prices.get(item.productId) * Math.max(1, parseInt(item.qty, 10) || 1);
  }
  subtotal = round2(subtotal);

  const result = await evaluatePromo(code, subtotal);
  if (result.error) throw new HttpError(400, result.error);
  res.json({
    code: result.promo.code,
    type: result.promo.type,
    value: result.promo.value,
    subtotal,
    discount: result.discount,
    total: round2(subtotal - result.discount)
  });
}));

// ---- admin: manage codes ----
router.get('/admin/promos', requireAdmin, wrap(async (req, res) => {
  const r = await db.query('SELECT * FROM promo_codes ORDER BY created_at DESC, id');
  res.json(r.rows.map(db.mapPromo));
}));

router.post('/admin/promos', requireAdmin, wrap(async (req, res) => {
  const parsed = parsePromoBody(req.body);
  if (parsed.error) throw new HttpError(400, parsed.error);
  const d = parsed.data;
  const exists = await db.query('SELECT 1 FROM promo_codes WHERE code = $1', [d.code]);
  if (exists.rows.length) throw new HttpError(400, 'That code already exists');

  const r = await db.query(`INSERT INTO promo_codes (id, code, type, value, min_order, max_uses, expires_at)
                            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [db.uuid(), d.code, d.type, d.value, d.minOrder, d.maxUses, d.expiresAt]);
  res.status(201).json(db.mapPromo(r.rows[0]));
}));

router.patch('/admin/promos/:id', requireAdmin, wrap(async (req, res) => {
  const cur = await db.query('SELECT * FROM promo_codes WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) throw new HttpError(404, 'Promo code not found');
  const active = typeof req.body.active === 'boolean' ? req.body.active : cur.rows[0].active;
  const r = await db.query('UPDATE promo_codes SET active = $2 WHERE id = $1 RETURNING *', [req.params.id, active]);
  res.json(db.mapPromo(r.rows[0]));
}));

router.delete('/admin/promos/:id', requireAdmin, wrap(async (req, res) => {
  const r = await db.query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
  if (!r.rowCount && !(r.affectedRows)) throw new HttpError(404, 'Promo code not found');
  res.json({ ok: true });
}));

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
