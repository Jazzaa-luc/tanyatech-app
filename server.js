require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./src/db');
const { MIN_ORDER_JD, FREE_DELIVERY_JD } = require('./src/settings');

const productsRoutes = require('./src/routes/products');
const ordersRoutes = require('./src/routes/orders');
const customRequestsRoutes = require('./src/routes/customRequests');
const adminRoutes = require('./src/routes/admin');
const promosRoutes = require('./src/routes/promos');
const uploadsRoutes = require('./src/routes/uploads');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 } // 8 hours
}));

// static files: the website itself. Uploaded pictures come from the database (uploadsRoutes).
app.use(express.static(path.join(__dirname, 'public')));
app.use(uploadsRoutes);
// public, non-secret config the frontend needs
app.get('/api/config', (req, res) => {
  res.json({
    cliqAlias: process.env.CLIQ_ALIAS || 'TANYATECH3D',
    minOrderJD: MIN_ORDER_JD,
    freeDeliveryJD: FREE_DELIVERY_JD
  });
});

app.use('/api', productsRoutes);
app.use('/api', ordersRoutes);
app.use('/api', customRequestsRoutes);
app.use('/api', adminRoutes);
app.use('/api', promosRoutes);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  // errors we raise on purpose (HttpError) and upload problems (too big, wrong type) are the customer's to fix;
  // anything else is ours, and its technical details are kept out of the reply.
  const status = err.status || (err.code && String(err.code).startsWith('LIMIT_') ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? err.message : 'Something went wrong on our side. Please try again.' });
});

// Connect to the database first; a sleeping hosted database can take a few seconds, so try a few times.
async function start() {
  for (let attempt = 1; ; attempt++) {
    try { await db.init(); break; }
    catch (err) {
      console.error(`Could not start the database (attempt ${attempt}/4): ${err.message}`);
      if (attempt >= 4) { console.error('Giving up. Check DATABASE_URL.'); process.exit(1); }
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  app.listen(PORT, () => {
    console.log(`TanyaTech server running at http://localhost:${PORT}`);
    console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
  });
}
start();
