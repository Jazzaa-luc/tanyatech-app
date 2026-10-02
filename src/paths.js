const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'uploads');

['products', 'invoices', 'requests'].forEach(s =>
  fs.mkdirSync(path.join(UPLOADS_DIR, s), { recursive: true })
);

module.exports = { DATA_DIR, UPLOADS_DIR };
