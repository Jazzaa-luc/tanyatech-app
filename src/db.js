// PostgreSQL storage for TanyaTech.
//
// Production: set DATABASE_URL (e.g. a free Neon database) and every product, order,
// promo code, custom request and uploaded image is kept there, so nothing is lost when
// the host restarts or redeploys.
//
// No DATABASE_URL (local development): a Postgres-compatible database (PGlite) is kept in
// the data folder instead. That is fine on your own computer, but on a host whose files
// are wiped on restart (Render free plan) it would lose data, so we warn loudly.

const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const { DATA_DIR, UPLOADS_DIR } = require('./paths');

const DATABASE_URL = process.env.DATABASE_URL || '';
const usingPostgres = !!DATABASE_URL;
// Render sets RENDER=true; its free plan wipes local files on every restart.
const onEphemeralHost = !!process.env.RENDER;
const isDurable = usingPostgres; // is data safe across restarts/redeploys?

let pool = null;   // pg Pool (DATABASE_URL set)
let lite = null;   // PGlite instance (no DATABASE_URL)

// ---------- connection ----------

async function connect() {
  if (usingPostgres) {
    const { Pool } = require('pg');
    const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(DATABASE_URL);
    pool = new Pool({
      connectionString: DATABASE_URL,
      // hosted databases need TLS; a sslmode in the URL is respected as written
      ssl: local || /sslmode=/.test(DATABASE_URL) ? undefined : true,
      max: 5,
      connectionTimeoutMillis: 20000, // a sleeping free database can take a few seconds to wake
      idleTimeoutMillis: 30000
    });
    // An idle connection dropped by the database must not crash the server.
    pool.on('error', err => console.error('Database connection error (will reconnect):', err.message));
    await pool.query('SELECT 1');
  } else {
    const { PGlite } = require('@electric-sql/pglite');
    const dir = path.join(DATA_DIR, 'pgdata');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    lite = await PGlite.create(dir);
  }
}

// query(sql, params) -> { rows }
function query(sql, params) {
  return usingPostgres ? pool.query(sql, params) : lite.query(sql, params);
}

// Runs several statements at once (used for creating the tables); no parameters.
function exec(sql) {
  return usingPostgres ? pool.query(sql) : lite.exec(sql);
}

// tx(async q => { ... }) runs the steps as one all-or-nothing transaction. q(sql, params) like query().
async function tx(fn) {
  if (usingPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn((s, p) => client.query(s, p));
      await client.query('COMMIT');
      return out;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) { /* connection already gone */ }
      throw err;
    } finally {
      client.release();
    }
  }
  return lite.transaction(t => fn((s, p) => t.query(s, p)));
}

// ---------- tables ----------

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key text PRIMARY KEY, value text);
CREATE TABLE IF NOT EXISTS categories (id serial PRIMARY KEY, name text UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ar text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT 'shop',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  colors jsonb NOT NULL DEFAULT '[]',
  images jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  phone text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(10,2),
  promo_code text,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  free_delivery boolean NOT NULL DEFAULT false,
  invoice_image text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS custom_requests (
  id text PRIMARY KEY,
  phone text NOT NULL,
  description text NOT NULL,
  image text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promo_codes (
  id text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  type text NOT NULL,
  value numeric(10,2) NOT NULL,
  min_order numeric(10,2) NOT NULL DEFAULT 0,
  max_uses integer NOT NULL DEFAULT 0,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS files (
  section text NOT NULL,
  filename text NOT NULL,
  mime text NOT NULL,
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section, filename)
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS requests_created_idx ON custom_requests (created_at DESC);
`;

// ---------- first-run data ----------

const SEED_CATEGORIES = ['Miniatures & Figurines', 'Home & Decor', 'Functional Parts', 'Custom Prototypes'];
const SEED_PRODUCTS = [
  { name: 'Articulated Dragon', category: 'Miniatures & Figurines', description: 'Flexible print-in-place dragon, joints move right off the print bed. Great desk companion.', price: 14, colors: [{ name: 'Orange', hex: '#FF6A3D' }, { name: 'Teal', hex: '#1E8E82' }, { name: 'Black', hex: '#1A1A1A' }] },
  { name: 'Geometric Planter', category: 'Home & Decor', description: 'Low-poly planter, 12cm, drainage hole included. Pairs well with small succulents.', price: 11, colors: [{ name: 'White', hex: '#F5F5F0' }, { name: 'Teal', hex: '#1E8E82' }] },
  { name: 'Cable Clip Set (x6)', category: 'Functional Parts', description: 'Self-adhesive desk cable clips, holds up to 3 cables each. Set of six.', price: 6, colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'White', hex: '#F5F5F0' }] },
  { name: 'Phone Stand — Slate', category: 'Functional Parts', description: 'Adjustable-angle phone stand, cable pass-through slot, non-slip base.', price: 9, colors: [{ name: 'Orange', hex: '#FF6A3D' }, { name: 'Black', hex: '#1A1A1A' }] },
  { name: 'Layered Vase — Dune', category: 'Home & Decor', description: 'Spiral-print vase, 18cm tall, watertight liner recommended for fresh flowers.', price: 16, colors: [{ name: 'White', hex: '#F5F5F0' }, { name: 'Orange', hex: '#FF6A3D' }] },
  { name: 'Mini Robot Buddy', category: 'Miniatures & Figurines', description: 'Chunky 7cm desk robot with swappable antenna. Kids love these.', price: 8, colors: [{ name: 'Teal', hex: '#1E8E82' }, { name: 'Orange', hex: '#FF6A3D' }, { name: 'White', hex: '#F5F5F0' }] }
];

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.heic': 'image/heic', '.avif': 'image/avif' };

async function seedStarterData() {
  const now = Date.now();
  await tx(async q => {
    for (const c of SEED_CATEGORIES) await q('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [c]);
    // earlier rows get later timestamps so the list shows in this order (newest first)
    for (let i = 0; i < SEED_PRODUCTS.length; i++) {
      const p = SEED_PRODUCTS[i];
      await q(`INSERT INTO products (id, name, section, category, description, price, colors, images, created_at)
               VALUES ($1,$2,'shop',$3,$4,$5,$6,'[]',$7)`,
        [uuid(), p.name, p.category, p.description, p.price, JSON.stringify(p.colors), new Date(now - i * 1000).toISOString()]);
    }
  });
  console.log('Database was empty: added the starter categories and sample products (delete them in the admin when you like).');
}

// Brings an old data/db.json (and its uploads folder) into the database. Returns true if it imported.
async function importLegacyJson() {
  const file = path.join(DATA_DIR, 'db.json');
  if (!fs.existsSync(file)) return false;
  let old;
  try { old = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) { console.error('Could not read old db.json, ignoring it:', e.message); return false; }

  await tx(async q => {
    for (const c of old.categories || []) await q('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [c]);
    for (const p of old.products || []) {
      await q(`INSERT INTO products (id, name, name_ar, section, category, description, description_ar, price, colors, images, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
        [p.id || uuid(), p.name || '', p.nameAr || '', p.section === 'coloring' ? 'coloring' : 'shop', p.category || '', p.description || '', p.descriptionAr || '',
          Number(p.price) || 0, JSON.stringify(p.colors || []), JSON.stringify(p.images || []), p.createdAt || new Date().toISOString()]);
    }
    for (const o of old.orders || []) {
      await q(`INSERT INTO orders (id, phone, items, subtotal, promo_code, discount, total, free_delivery, invoice_image, status, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
        [o.id, o.phone || '', JSON.stringify(o.items || []), o.subtotal ?? null, o.promoCode || null, Number(o.discount) || 0, Number(o.total) || 0,
          !!o.freeDelivery, o.invoiceImage || null, o.status || 'pending', o.createdAt || new Date().toISOString()]);
    }
    for (const r of old.customRequests || []) {
      await q(`INSERT INTO custom_requests (id, phone, description, image, status, created_at)
               VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [r.id, r.phone || '', r.description || '', r.image || null, r.status || 'new', r.createdAt || new Date().toISOString()]);
    }
    for (const c of old.promoCodes || []) {
      await q(`INSERT INTO promo_codes (id, code, type, value, min_order, max_uses, uses, expires_at, active, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [c.id || uuid(), c.code, c.type, c.value, c.minOrder || 0, c.maxUses || 0, c.uses || 0, c.expiresAt || null, c.active !== false, c.createdAt || new Date().toISOString()]);
    }
    // the picture files that went with them
    for (const section of ['products', 'invoices', 'requests']) {
      const dir = path.join(UPLOADS_DIR, section);
      if (!fs.existsSync(dir)) continue;
      for (const filename of fs.readdirSync(dir)) {
        const mime = MIME[path.extname(filename).toLowerCase()];
        if (!mime) continue; // skips .gitkeep and anything that isn't a picture
        await q('INSERT INTO files (section, filename, mime, data) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [section, filename, mime, fs.readFileSync(path.join(dir, filename))]);
      }
    }
  });
  console.log('Imported your existing data from data/db.json into the database.');
  return true;
}

async function init() {
  await connect();
  await exec(SCHEMA);
  const done = await query("SELECT 1 FROM meta WHERE key = 'initialized'");
  if (!done.rows.length) {
    // Only the very first start fills the database; after that it is never re-seeded.
    if (!(await importLegacyJson())) await seedStarterData();
    await query("INSERT INTO meta (key, value) VALUES ('initialized', $1) ON CONFLICT DO NOTHING", [new Date().toISOString()]);
  }
  if (usingPostgres) {
    console.log('Database: PostgreSQL (DATABASE_URL) — data and images are saved permanently.');
  } else if (onEphemeralHost) {
    console.warn('\n⚠️  DATABASE_URL is not set and this host (Render) erases local files on every restart.\n' +
      '   Orders, products and images WILL BE LOST. Set DATABASE_URL to a PostgreSQL database (see README).\n');
  } else {
    console.log('Database: local file in ' + path.join(DATA_DIR, 'pgdata') + ' (set DATABASE_URL to use PostgreSQL).');
  }
}

// ---------- row -> JSON shapes (what the website already expects) ----------

const iso = v => (v ? new Date(v).toISOString() : null);
const num = v => (v === null || v === undefined ? null : Number(v));

const mapProduct = r => ({
  id: r.id, name: r.name, nameAr: r.name_ar, section: r.section, category: r.category,
  description: r.description, descriptionAr: r.description_ar, price: num(r.price),
  colors: r.colors || [], images: r.images || [], createdAt: iso(r.created_at)
});
const mapOrder = r => ({
  id: r.id, phone: r.phone, items: r.items || [], subtotal: num(r.subtotal), promoCode: r.promo_code,
  discount: num(r.discount), total: num(r.total), freeDelivery: r.free_delivery,
  invoiceImage: r.invoice_image, status: r.status, createdAt: iso(r.created_at)
});
const mapRequest = r => ({
  id: r.id, phone: r.phone, description: r.description, image: r.image, status: r.status, createdAt: iso(r.created_at)
});
const mapPromo = r => ({
  id: r.id, code: r.code, type: r.type, value: num(r.value), minOrder: num(r.min_order), maxUses: r.max_uses,
  uses: r.uses, expiresAt: iso(r.expires_at), active: r.active, createdAt: iso(r.created_at)
});

// ---------- uploaded pictures (kept in the database) ----------

const SECTIONS = ['products', 'invoices', 'requests'];

// Saves an uploaded picture (from multer memory storage) and returns its public URL.
async function saveFile(q, section, file) {
  const ext = (path.extname(file.originalname || '').toLowerCase() || '.jpg').replace(/[^.a-z0-9]/g, '');
  const filename = uuid() + ext;
  await q('INSERT INTO files (section, filename, mime, data) VALUES ($1,$2,$3,$4)', [section, filename, file.mimetype, file.buffer]);
  return `/uploads/${section}/${filename}`;
}

// Removes pictures when the product/request that used them goes away.
async function deleteFilesByUrls(urls, q = query) {
  for (const url of urls || []) {
    const m = /^\/uploads\/(products|invoices|requests)\/([^/]+)$/.exec(url || '');
    if (m) await q('DELETE FROM files WHERE section = $1 AND filename = $2', [m[1], m[2]]);
  }
}

async function getFile(section, filename) {
  if (!SECTIONS.includes(section)) return null;
  const r = await query('SELECT mime, data FROM files WHERE section = $1 AND filename = $2', [section, filename]);
  if (!r.rows.length) return null;
  return { mime: r.rows[0].mime, data: Buffer.from(r.rows[0].data) };
}

module.exports = {
  init, query, tx, uuid, isDurable, usingPostgres, onEphemeralHost,
  mapProduct, mapOrder, mapRequest, mapPromo,
  saveFile, deleteFilesByUrls, getFile
};
