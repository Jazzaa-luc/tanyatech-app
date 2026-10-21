const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../upload');
const { evaluatePromo } = require('./promos');

const uploadInvoice = makeUploader('invoices');
const { MIN_ORDER_JD, FREE_DELIVERY_JD } = require('../settings');

// ---- public: place an order ----
router.post('/orders', uploadInvoice.single('invoiceImage'), (req, res) => {
  const state = db.load();
  const { phone, items } = req.body;

  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required' });
  if (!items) return res.status(400).json({ error: 'Cart is empty' });
  if (!req.file) return res.status(400).json({ error: 'Payment screenshot is required' });

  let parsedItems;
  try { parsedItems = JSON.parse(items); } catch (e) { return res.status(400).json({ error: 'Invalid items' }); }
  if (!Array.isArray(parsedItems) || !parsedItems.length) return res.status(400).json({ error: 'Cart is empty' });

  // Recompute totals server-side from the current catalog so prices can't be tampered with client-side.
  let total = 0;
  const resolvedItems = [];
  for (const item of parsedItems) {
    const product = state.products.find(p => p.id === item.productId);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    total += product.price * qty;
    resolvedItems.push({ productId: product.id, name: product.name, color: item.color || null, qty, price: product.price });
  }
  if (!resolvedItems.length) return res.status(400).json({ error: 'Cart items are no longer available' });
  if (total < MIN_ORDER_JD) return res.status(400).json({ error: `Minimum order is ${MIN_ORDER_JD.toFixed(2)} JD` });

  // Optional promo code, re-checked here so the discount can't be faked from the browser.
  const subtotal = Math.round(total * 100) / 100;
  let discount = 0;
  let promoCode = null;
  let appliedPromo = null;
  if (req.body.promoCode && String(req.body.promoCode).trim()) {
    const result = evaluatePromo(state, req.body.promoCode, subtotal);
    if (result.error) return res.status(400).json({ error: result.error });
    appliedPromo = result.promo;
    promoCode = result.promo.code;
    discount = result.discount;
  }

  const order = {
    id: 'ORD-' + db.uuid().slice(0, 6).toUpperCase(),
    phone: phone.trim(),
    items: resolvedItems,
    subtotal,
    promoCode,
    discount,
    total: Math.round((subtotal - discount) * 100) / 100,
    // free delivery is judged on what the customer actually pays (after any promo code)
    freeDelivery: Math.round((subtotal - discount) * 100) / 100 >= FREE_DELIVERY_JD,
    invoiceImage: `/uploads/invoices/${req.file.filename}`,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  if (appliedPromo) appliedPromo.uses = (appliedPromo.uses || 0) + 1;
  state.orders.unshift(order);
  db.persist();

  res.status(201).json({
    order,
    whatsapp: buildOrderWhatsAppLink(order)
  });
});

function buildOrderWhatsAppLink(order) {
  const adminNumber = (process.env.ADMIN_WHATSAPP || '').replace(/[^0-9]/g, '');
  const lines = order.items.map(i => `- ${i.qty}x ${i.name}${i.color ? ' (' + i.color + ')' : ''} - ${(i.price * i.qty).toFixed(2)} JD`).join('\n');
  const promoLine = order.discount > 0 ? `\nPromo ${order.promoCode}: -${order.discount.toFixed(2)} JD` : '';
  const deliveryLine = order.freeDelivery ? '\nDelivery: Free' : '';
  const text = `New order ${order.id}\n${lines}${promoLine}${deliveryLine}\nTotal: ${order.total.toFixed(2)} JD\nCustomer phone: ${order.phone}\nPayment: CliQ transfer completed, screenshot saved with the order.`;
  return `https://wa.me/${adminNumber}?text=${encodeURIComponent(text)}`;
}

// ---- admin ----
router.get('/admin/orders', requireAdmin, (req, res) => {
  const state = db.load();
  res.json(state.orders);
});

router.patch('/admin/orders/:id', requireAdmin, (req, res) => {
  const state = db.load();
  const order = state.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  order.status = status;
  db.persist();
  res.json(order);
});

router.get('/admin/orders/:id/whatsapp', requireAdmin, (req, res) => {
  const state = db.load();
  const order = state.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const customerNumber = order.phone.replace(/[^0-9]/g, '').replace(/^0/, '962');
  const text = `Hi, this is TanyaTech regarding your order ${order.id}. Total: ${order.total.toFixed(2)} JD. Status: ${order.status}.`;
  res.json({ url: `https://wa.me/${customerNumber}?text=${encodeURIComponent(text)}` });
});

module.exports = router;
