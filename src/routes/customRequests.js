const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../upload');

const uploadReference = makeUploader('requests');

// ---- public ----
router.post('/custom-requests', uploadReference.single('image'), (req, res) => {
  const state = db.load();
  const { phone, description } = req.body;

  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });

  const request = {
    id: 'CR-' + db.uuid().slice(0, 6).toUpperCase(),
    phone: phone.trim(),
    description: description.trim(),
    image: req.file ? `/uploads/requests/${req.file.filename}` : null,
    status: 'new',
    createdAt: new Date().toISOString()
  };

  state.customRequests.unshift(request);
  db.persist();

  const adminNumber = (process.env.ADMIN_WHATSAPP || '').replace(/[^0-9]/g, '');
  const text = `Custom print request ${request.id}\nDescription: ${request.description}\nPhone: ${request.phone}` +
    (request.image ? '\n(Reference image saved with the request.)' : '');
  const whatsapp = `https://wa.me/${adminNumber}?text=${encodeURIComponent(text)}`;

  res.status(201).json({ request, whatsapp });
});

// ---- admin ----
router.get('/admin/custom-requests', requireAdmin, (req, res) => {
  const state = db.load();
  res.json(state.customRequests);
});

router.patch('/admin/custom-requests/:id', requireAdmin, (req, res) => {
  const state = db.load();
  const request = state.customRequests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  const { status } = req.body;
  if (!['new', 'contacted', 'done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  request.status = status;
  db.persist();
  res.json(request);
});

router.get('/admin/custom-requests/:id/whatsapp', requireAdmin, (req, res) => {
  const state = db.load();
  const request = state.customRequests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  const customerNumber = request.phone.replace(/[^0-9]/g, '').replace(/^0/, '962');
  const text = `Hi, this is TanyaTech regarding your custom print request ${request.id}: ${request.description}`;
  res.json({ url: `https://wa.me/${customerNumber}?text=${encodeURIComponent(text)}` });
});

module.exports = router;
