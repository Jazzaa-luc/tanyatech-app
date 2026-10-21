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
  const section = req.body.section === 'coloring' ? 'coloring' : 'shop';

  // Tanya Coloring products don't need a shop category
  if (!name || !description || price === undefined || (section === 'shop' && !category && !newCategory)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let finalCategory = '';
  if (section === 'shop') {
    finalCategory = (newCategory && newCategory.trim()) || category;
    if (newCategory && newCategory.trim() && !state.categories.includes(newCategory.trim())) {
      state.categories.push(newCategory.trim());
    }
  }

  let parsedColors = [];
  try { parsedColors = JSON.parse(colors || '[]'); } catch (e) { parsedColors = []; }
  // shop items always have at least one color; coloring items are colored by the customer, so none is fine
  if (!parsedColors.length && section === 'shop') parsedColors = [{ name: 'Default', hex: '#2860C0' }];

  const images = (req.files || []).map(f => `/uploads/products/${f.filename}`);

  const product = {
    id: db.uuid(),
    name: name.trim(),
    nameAr: (req.body.nameAr || '').trim(),
    section,
    category: finalCategory,
    description: description.trim(),
    descriptionAr: (req.body.descriptionAr || '').trim(),
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

  // Work out the section and category first, so a bad request changes nothing.
  const newSection = (req.body.section === 'coloring' || req.body.section === 'shop') ? req.body.section : (product.section || 'shop');
  const finalCategory = (newCategory && newCategory.trim()) || category;
  const resultingCategory = newSection === 'coloring' ? product.category : (finalCategory || product.category);
  if (newSection === 'shop' && !resultingCategory) return res.status(400).json({ error: 'Missing required fields' });

  product.section = newSection;
  if (newSection === 'shop') {
    if (newCategory && newCategory.trim() && !state.categories.includes(newCategory.trim())) {
      state.categories.push(newCategory.trim());
    }
    product.category = resultingCategory;
  }
  if (name) product.name = name.trim();
  if (description) product.description = description.trim();
  if (req.body.nameAr !== undefined) product.nameAr = String(req.body.nameAr).trim();
  if (req.body.descriptionAr !== undefined) product.descriptionAr = String(req.body.descriptionAr).trim();
  if (price !== undefined) product.price = parseFloat(price) || 0;

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
