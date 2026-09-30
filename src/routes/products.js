const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../upload');

const uploadProductImages = makeUploader('products');

// ---- public ----

router.get('/products', (req, res) => {
  const state = db.load();
  res.json(state.products);
});

router.get('/categories', (req, res) => {
  const state = db.load();
  res.json(state.categories);
});

// ---- admin ----

router.post('/admin/products', requireAdmin, uploadProductImages.array('images', 8), (req, res) => {
  const state = db.load();
  const { name, description, price, category, newCategory, colors } = req.body;

  if (!name || !description || price === undefined || (!category && !newCategory)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const finalCategory = (newCategory && newCategory.trim()) || category;
  if (newCategory && newCategory.trim() && !state.categories.includes(newCategory.trim())) {
    state.categories.push(newCategory.trim());
  }

  let parsedColors = [];
  try { parsedColors = JSON.parse(colors || '[]'); } catch (e) { parsedColors = []; }
  if (!parsedColors.length) parsedColors = [{ name: 'Default', hex: '#FF6A3D' }];

  const images = (req.files || []).map(f => `/uploads/products/${f.filename}`);

  const product = {
    id: db.uuid(),
    name: name.trim(),
    category: finalCategory,
    description: description.trim(),
    price: parseFloat(price) || 0,
    colors: parsedColors,
    images: images.length ? images : [],
    createdAt: new Date().toISOString()
  };

  state.products.unshift(product);
  db.persist();
  res.status(201).json(product);
});

router.put('/admin/products/:id', requireAdmin, uploadProductImages.array('images', 8), (req, res) => {
  const state = db.load();
  const product = state.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { name, description, price, category, newCategory, colors, keepImages } = req.body;

  if (name) product.name = name.trim();
  if (description) product.description = description.trim();
  if (price !== undefined) product.price = parseFloat(price) || 0;

  const finalCategory = (newCategory && newCategory.trim()) || category;
  if (newCategory && newCategory.trim() && !state.categories.includes(newCategory.trim())) {
    state.categories.push(newCategory.trim());
  }
  if (finalCategory) product.category = finalCategory;

  if (colors) {
    try {
      const parsed = JSON.parse(colors);
      if (Array.isArray(parsed) && parsed.length) product.colors = parsed;
    } catch (e) { /* keep existing colors on bad input */ }
  }

  let kept = [];
  if (keepImages) {
    try { kept = JSON.parse(keepImages); } catch (e) { kept = product.images; }
  } else {
    kept = product.images;
  }
  const newImages = (req.files || []).map(f => `/uploads/products/${f.filename}`);
  product.images = [...kept, ...newImages];

  db.persist();
  res.json(product);
});

router.delete('/admin/products/:id', requireAdmin, (req, res) => {
  const state = db.load();
  const before = state.products.length;
  state.products = state.products.filter(p => p.id !== req.params.id);
  if (state.products.length === before) return res.status(404).json({ error: 'Product not found' });
  db.persist();
  res.json({ ok: true });
});

module.exports = router;
