// Tiny JSON-file database. No native build tools required, so it installs
// and runs anywhere Node.js runs. Good for a small storefront like this one;
// swap this module out for a real database later without touching routes,
// since everything else only talks to the functions exported here.

const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const { DATA_DIR } = require('./paths');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function seedData() {
  const categories = ['Miniatures & Figurines', 'Home & Decor', 'Functional Parts', 'Custom Prototypes'];
  const now = new Date().toISOString();
  const products = [
    {
      id: uuid(), name: 'Articulated Dragon', category: 'Miniatures & Figurines',
      description: 'Flexible print-in-place dragon, joints move right off the print bed. Great desk companion.',
      price: 14, colors: [{ name: 'Orange', hex: '#FF6A3D' }, { name: 'Teal', hex: '#1E8E82' }, { name: 'Black', hex: '#1A1A1A' }],
      images: [], createdAt: now
    },
    {
      id: uuid(), name: 'Geometric Planter', category: 'Home & Decor',
      description: 'Low-poly planter, 12cm, drainage hole included. Pairs well with small succulents.',
      price: 11, colors: [{ name: 'White', hex: '#F5F5F0' }, { name: 'Teal', hex: '#1E8E82' }],
      images: [], createdAt: now
    },
    {
      id: uuid(), name: 'Cable Clip Set (x6)', category: 'Functional Parts',
      description: 'Self-adhesive desk cable clips, holds up to 3 cables each. Set of six.',
      price: 6, colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'White', hex: '#F5F5F0' }],
      images: [], createdAt: now
    },
    {
      id: uuid(), name: 'Phone Stand — Slate', category: 'Functional Parts',
      description: 'Adjustable-angle phone stand, cable pass-through slot, non-slip base.',
      price: 9, colors: [{ name: 'Orange', hex: '#FF6A3D' }, { name: 'Black', hex: '#1A1A1A' }],
      images: [], createdAt: now
    },
    {
      id: uuid(), name: 'Layered Vase — Dune', category: 'Home & Decor',
      description: 'Spiral-print vase, 18cm tall, watertight liner recommended for fresh flowers.',
      price: 16, colors: [{ name: 'White', hex: '#F5F5F0' }, { name: 'Orange', hex: '#FF6A3D' }],
      images: [], createdAt: now
    },
    {
      id: uuid(), name: 'Mini Robot Buddy', category: 'Miniatures & Figurines',
      description: "Chunky 7cm desk robot with swappable antenna. Kids love these.",
      price: 8, colors: [{ name: 'Teal', hex: '#1E8E82' }, { name: 'Orange', hex: '#FF6A3D' }, { name: 'White', hex: '#F5F5F0' }],
      images: [], createdAt: now
    }
  ];
  return { categories, products, orders: [], customRequests: [] };
}

let cache = null;

function ensureFile() {
  if (!fs.existsSync(path.dirname(DB_FILE))) fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seedData(), null, 2));
  }
}

function load() {
  if (cache) return cache;
  ensureFile();
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    cache = seedData();
  }
  if (!cache.categories) cache.categories = [];
  if (!cache.products) cache.products = [];
  if (!cache.orders) cache.orders = [];
  if (!cache.customRequests) cache.customRequests = [];
  return cache;
}

function persist() {
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2));
}

module.exports = { load, persist, uuid };
