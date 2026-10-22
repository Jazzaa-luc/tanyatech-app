const express = require('express');
const router = express.Router();
const db = require('../db');
const { wrap } = require('../http');

// Serves pictures stored in the database at the same /uploads/<section>/<file> addresses as before.
router.get('/uploads/:section/:filename', wrap(async (req, res) => {
  const file = await db.getFile(req.params.section, req.params.filename);
  if (!file) return res.status(404).end();
  res.set('Content-Type', file.mime);
  res.set('Cache-Control', 'public, max-age=31536000, immutable'); // file names are unique, content never changes
  res.send(file.data);
}));

module.exports = router;
