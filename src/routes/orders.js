const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../upload');

const uploadInvoice = makeUploader('invoices');
const MIN_ORDER_JD = parseFloat(process.env.MIN_ORDER_JD || '10');

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

  const order = {
    id: 'ORD-' + db.uuid().slice(0, 6).toUpperCase(),
    phone: phone.trim(),
    items: resolvedItems,
    total: Math.round(total * 100) / 100,
    invoiceImage: `/uploads/invoices/${req.file.filename}`,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

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
  const text = `New order ${order.id}\n${lines}\nTotal: ${order.total.toFixed(2)} JD\nCustomer phone: ${order.phone}\nPayment: CliQ transfer completed, screenshot saved with the order.`;
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
