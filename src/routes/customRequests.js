const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../upload');
const { wrap, HttpError } = require('../http');

const uploadReference = makeUploader();

// ---- public ----
router.post('/custom-requests', uploadReference.single('image'), wrap(async (req, res) => {
  const { phone, description } = req.body;

  if (!phone || !phone.trim()) throw new HttpError(400, 'Phone number is required');
  if (!description || !description.trim()) throw new HttpError(400, 'Description is required');

  const request = await db.tx(async q => {
    const image = req.file ? await db.saveFile(q, 'requests', req.file) : null;
    const r = await q(`INSERT INTO custom_requests (id, phone, description, image) VALUES ($1,$2,$3,$4) RETURNING *`,
      ['CR-' + db.uuid().slice(0, 6).toUpperCase(), phone.trim(), description.trim(), image]);
    return db.mapRequest(r.rows[0]);
  });

  const adminNumber = (process.env.ADMIN_WHATSAPP || '').replace(/[^0-9]/g, '');
  const text = `Custom print request ${request.id}\nDescription: ${request.description}\nPhone: ${request.phone}` +
    (request.image ? '\n(Reference image saved with the request.)' : '');
  const whatsapp = `https://wa.me/${adminNumber}?text=${encodeURIComponent(text)}`;

  res.status(201).json({ request, whatsapp });
}));

// ---- admin ----
router.get('/admin/custom-requests', requireAdmin, wrap(async (req, res) => {
  const r = await db.query('SELECT * FROM custom_requests ORDER BY created_at DESC, id');
  res.json(r.rows.map(db.mapRequest));
}));

router.patch('/admin/custom-requests/:id', requireAdmin, wrap(async (req, res) => {
  const { status } = req.body;
  if (!['new', 'contacted', 'done'].includes(status)) throw new HttpError(400, 'Invalid status');
  const r = await db.query('UPDATE custom_requests SET status = $2 WHERE id = $1 RETURNING *', [req.params.id, status]);
  if (!r.rows.length) throw new HttpError(404, 'Request not found');
  res.json(db.mapRequest(r.rows[0]));
}));

router.get('/admin/custom-requests/:id/whatsapp', requireAdmin, wrap(async (req, res) => {
  const r = await db.query('SELECT * FROM custom_requests WHERE id = $1', [req.params.id]);
  if (!r.rows.length) throw new HttpError(404, 'Request not found');
  const request = db.mapRequest(r.rows[0]);
  const customerNumber = request.phone.replace(/[^0-9]/g, '').replace(/^0/, '962');
  const text = `Hi, this is TanyaTech regarding your custom print request ${request.id}: ${request.description}`;
  res.json({ url: `https://wa.me/${customerNumber}?text=${encodeURIComponent(text)}` });
}));

module.exports = router;
