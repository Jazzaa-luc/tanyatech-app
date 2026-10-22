const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../upload');
const { evaluatePromo } = require('./promos');
const { wrap, HttpError } = require('../http');
const { MIN_ORDER_JD, FREE_DELIVERY_JD } = require('../settings');

const uploadInvoice = makeUploader();
const round2 = n => Math.round(n * 100) / 100;

// ---- public: place an order ----
router.post('/orders', uploadInvoice.single('invoiceImage'), wrap(async (req, res) => {
  const { phone, items } = req.body;

  if (!phone || !phone.trim()) throw new HttpError(400, 'Phone number is required');
  if (!items) throw new HttpError(400, 'Cart is empty');
  if (!req.file) throw new HttpError(400, 'Payment screenshot is required');

  let parsedItems;
  try { parsedItems = JSON.parse(items); } catch (e) { throw new HttpError(400, 'Invalid items'); }
  if (!Array.isArray(parsedItems) || !parsedItems.length) throw new HttpError(400, 'Cart is empty');

  // Recompute totals server-side from the current catalog so prices can't be tampered with client-side.
  const catalog = new Map((await db.query('SELECT id, name, price FROM products')).rows.map(p => [p.id, p]));
  let total = 0;
  const resolvedItems = [];
  for (const item of parsedItems) {
    const product = catalog.get(item.productId);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    const price = Number(product.price);
    total += price * qty;
    resolvedItems.push({ productId: product.id, name: product.name, color: item.color || null, qty, price });
  }
  if (!resolvedItems.length) throw new HttpError(400, 'Cart items are no longer available');
  if (total < MIN_ORDER_JD) throw new HttpError(400, `Minimum order is ${MIN_ORDER_JD.toFixed(2)} JD`);

  // Optional promo code, re-checked here so the discount can't be faked from the browser.
  const subtotal = round2(total);
  let discount = 0;
  let promo = null;
  if (req.body.promoCode && String(req.body.promoCode).trim()) {
    const result = await evaluatePromo(req.body.promoCode, subtotal);
    if (result.error) throw new HttpError(400, result.error);
    promo = result.promo;
    discount = result.discount;
  }
  const finalTotal = round2(subtotal - discount);

  const order = await db.tx(async q => {
    // Count the code's use and check its limit in one step, so two customers can't both take the last use.
    if (promo) {
      const used = await q(`UPDATE promo_codes SET uses = uses + 1
                            WHERE id = $1 AND active AND (max_uses = 0 OR uses < max_uses) RETURNING id`, [promo.id]);
      if (!used.rows.length) throw new HttpError(400, 'This promo code has reached its usage limit');
    }
    const invoiceImage = await db.saveFile(q, 'invoices', req.file);
    const r = await q(`INSERT INTO orders (id, phone, items, subtotal, promo_code, discount, total, free_delivery, invoice_image, status)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *`,
      ['ORD-' + db.uuid().slice(0, 6).toUpperCase(), phone.trim(), JSON.stringify(resolvedItems), subtotal,
        promo ? promo.code : null, discount, finalTotal,
        // free delivery is judged on what the customer actually pays (after any promo code)
        finalTotal >= FREE_DELIVERY_JD, invoiceImage]);
    return db.mapOrder(r.rows[0]);
  });

  res.status(201).json({ order, whatsapp: buildOrderWhatsAppLink(order) });
}));

function buildOrderWhatsAppLink(order) {
  const adminNumber = (process.env.ADMIN_WHATSAPP || '').replace(/[^0-9]/g, '');
  const lines = order.items.map(i => `- ${i.qty}x ${i.name}${i.color ? ' (' + i.color + ')' : ''} - ${(i.price * i.qty).toFixed(2)} JD`).join('\n');
  const promoLine = order.discount > 0 ? `\nPromo ${order.promoCode}: -${order.discount.toFixed(2)} JD` : '';
  const deliveryLine = order.freeDelivery ? '\nDelivery: Free' : '';
  const text = `New order ${order.id}\n${lines}${promoLine}${deliveryLine}\nTotal: ${order.total.toFixed(2)} JD\nCustomer phone: ${order.phone}\nPayment: CliQ transfer completed, screenshot saved with the order.`;
  return `https://wa.me/${adminNumber}?text=${encodeURIComponent(text)}`;
}

// ---- admin ----
router.get('/admin/orders', requireAdmin, wrap(async (req, res) => {
  const r = await db.query('SELECT * FROM orders ORDER BY created_at DESC, id');
  res.json(r.rows.map(db.mapOrder));
}));

router.patch('/admin/orders/:id', requireAdmin, wrap(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new HttpError(400, 'Invalid status');
  const r = await db.query('UPDATE orders SET status = $2 WHERE id = $1 RETURNING *', [req.params.id, status]);
  if (!r.rows.length) throw new HttpError(404, 'Order not found');
  res.json(db.mapOrder(r.rows[0]));
}));

router.get('/admin/orders/:id/whatsapp', requireAdmin, wrap(async (req, res) => {
  const r = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!r.rows.length) throw new HttpError(404, 'Order not found');
  const order = db.mapOrder(r.rows[0]);
  const customerNumber = order.phone.replace(/[^0-9]/g, '').replace(/^0/, '962');
  const text = `Hi, this is TanyaTech regarding your order ${order.id}. Total: ${order.total.toFixed(2)} JD. Status: ${order.status}.`;
  res.json({ url: `https://wa.me/${customerNumber}?text=${encodeURIComponent(text)}` });
}));

module.exports = router;
