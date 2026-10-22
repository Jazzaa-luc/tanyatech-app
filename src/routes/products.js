const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../upload');
const { wrap, HttpError } = require('../http');

const uploadProductImages = makeUploader();

// ---- public ----

router.get('/products', wrap(async (req, res) => {
  const r = await db.query('SELECT * FROM products ORDER BY created_at DESC, id');
  res.json(r.rows.map(db.mapProduct));
}));

router.get('/categories', wrap(async (req, res) => {
  const r = await db.query('SELECT name FROM categories ORDER BY id');
  res.json(r.rows.map(x => x.name));
}));

// ---- admin ----

router.post('/admin/products', requireAdmin, uploadProductImages.array('images', 8), wrap(async (req, res) => {
  const { name, description, price, category, newCategory, colors } = req.body;
  const section = req.body.section === 'coloring' ? 'coloring' : 'shop';

  // Tanya Coloring products don't need a shop category
  if (!name || !description || price === undefined || (section === 'shop' && !category && !newCategory)) {
    throw new HttpError(400, 'Missing required fields');
  }

  let finalCategory = '';
  const newCat = (newCategory || '').trim();
  if (section === 'shop') finalCategory = newCat || category;

  let parsedColors = [];
  try { parsedColors = JSON.parse(colors || '[]'); } catch (e) { parsedColors = []; }
  // shop items always have at least one color; coloring items are colored by the customer, so none is fine
  if (!parsedColors.length && section === 'shop') parsedColors = [{ name: 'Default', hex: '#2860C0' }];

  const product = await db.tx(async q => {
    if (section === 'shop' && newCat) await q('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [newCat]);
    const images = [];
    for (const f of req.files || []) images.push(await db.saveFile(q, 'products', f));
    const r = await q(`INSERT INTO products (id, name, name_ar, section, category, description, description_ar, price, colors, images)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [db.uuid(), name.trim(), (req.body.nameAr || '').trim(), section, finalCategory, description.trim(),
        (req.body.descriptionAr || '').trim(), parseFloat(price) || 0, JSON.stringify(parsedColors), JSON.stringify(images)]);
    return db.mapProduct(r.rows[0]);
  });
  res.status(201).json(product);
}));

router.put('/admin/products/:id', requireAdmin, uploadProductImages.array('images', 8), wrap(async (req, res) => {
  const cur = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) throw new HttpError(404, 'Product not found');
  const product = db.mapProduct(cur.rows[0]);

  const { name, description, price, category, newCategory, colors, keepImages } = req.body;

  // Work out the section and category first, so a bad request changes nothing.
  const newSection = (req.body.section === 'coloring' || req.body.section === 'shop') ? req.body.section : (product.section || 'shop');
  const newCat = (newCategory || '').trim();
  const finalCategory = newCat || category;
  const resultingCategory = newSection === 'coloring' ? product.category : (finalCategory || product.category);
  if (newSection === 'shop' && !resultingCategory) throw new HttpError(400, 'Missing required fields');

  let nextColors = product.colors;
  if (colors) {
    try {
      const parsed = JSON.parse(colors);
      if (Array.isArray(parsed) && parsed.length) nextColors = parsed;
    } catch (e) { /* keep existing colors on bad input */ }
  }

  let kept = product.images;
  if (keepImages) {
    try { kept = JSON.parse(keepImages); } catch (e) { kept = product.images; }
  }
  const removed = product.images.filter(u => !kept.includes(u));

  const updated = await db.tx(async q => {
    if (newSection === 'shop' && newCat) await q('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [newCat]);
    const images = [...kept];
    for (const f of req.files || []) images.push(await db.saveFile(q, 'products', f));
    const r = await q(`UPDATE products SET name=$2, name_ar=$3, section=$4, category=$5, description=$6, description_ar=$7,
                         price=$8, colors=$9, images=$10 WHERE id=$1 RETURNING *`,
      [product.id,
        name ? name.trim() : product.name,
        req.body.nameAr !== undefined ? String(req.body.nameAr).trim() : product.nameAr,
        newSection,
        newSection === 'shop' ? resultingCategory : product.category,
        description ? description.trim() : product.description,
        req.body.descriptionAr !== undefined ? String(req.body.descriptionAr).trim() : product.descriptionAr,
        price !== undefined ? (parseFloat(price) || 0) : product.price,
        JSON.stringify(nextColors), JSON.stringify(images)]);
    await db.deleteFilesByUrls(removed, q); // pictures the admin took off the product
    return db.mapProduct(r.rows[0]);
  });
  res.json(updated);
}));

router.delete('/admin/products/:id', requireAdmin, wrap(async (req, res) => {
  await db.tx(async q => {
    const r = await q('DELETE FROM products WHERE id = $1 RETURNING images', [req.params.id]);
    if (!r.rows.length) throw new HttpError(404, 'Product not found');
    await db.deleteFilesByUrls(r.rows[0].images, q);
  });
  res.json({ ok: true });
}));

module.exports = router;
