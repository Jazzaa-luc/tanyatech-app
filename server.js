require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const productsRoutes = require('./src/routes/products');
const ordersRoutes = require('./src/routes/orders');
const customRequestsRoutes = require('./src/routes/customRequests');
const adminRoutes = require('./src/routes/admin');

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

// static files: frontend + uploaded images
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// public, non-secret config the frontend needs
app.get('/api/config', (req, res) => {
  res.json({
    cliqAlias: process.env.CLIQ_ALIAS || 'TANYATECH3D',
    minOrderJD: parseFloat(process.env.MIN_ORDER_JD || '10')
  });
});

app.use('/api', productsRoutes);
app.use('/api', ordersRoutes);
app.use('/api', customRequestsRoutes);
app.use('/api', adminRoutes);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`TanyaTech server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
});
