const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Incorrect password' });
});

router.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// Tells the admin dashboard whether orders/products are being saved permanently.
router.get('/admin/storage', requireAdmin, (req, res) => {
  res.json({ durable: db.isDurable, onEphemeralHost: db.onEphemeralHost, database: db.usingPostgres ? 'postgres' : 'local' });
});

module.exports = router;
