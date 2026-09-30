# TanyaTech — 3D Printing Storefront + Admin Dashboard

A Node.js (Express) web app for a 3D printing business: a login-free customer
storefront and a password-protected admin dashboard, built around WhatsApp as
the hand-off point for orders and custom print requests.

## What's included

**Customer side** (`/`)
- Navbar: Products (with a category dropdown), Services, About Us
- Product catalog with categories, colors, images, add-to-cart — no account needed
- Cart with a 10 JD order minimum (configurable)
- Checkout: phone number → CliQ payment instructions → upload a payment
  screenshot → order is saved and WhatsApp opens with the order details
- Services page: custom print requests (phone, description, optional photo),
  also sent to you on WhatsApp
- "About Us" scrolls to the about section at the bottom of the page

**Admin side** (`/admin`)
- Password-protected (one shared admin password, see Configuration below)
- **Orders tab**: every order with its ID and customer phone, the payment
  screenshot, approve/reject actions, and a "Message on WhatsApp" button
- **Custom requests tab**: every service request with its reference photo and
  a "Message on WhatsApp" button
- **Products tab**: add, edit, delete products — name, description, price,
  category (or a new one), colors, and multiple images

## Requirements

- Node.js 18 or newer

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and set at least:

- `ADMIN_PASSWORD` — the password for `/admin`
- `ADMIN_WHATSAPP` — your business WhatsApp number, international format,
  digits only, no `+` (e.g. `9627xxxxxxxx` for Jordan)
- `CLIQ_ALIAS` — the CliQ alias customers should pay to
- `SESSION_SECRET` — any long random string

Then run it:

```bash
npm start
```

- Storefront: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin

Product images, payment screenshots, and reference photos are saved to
`uploads/`. Orders, custom requests, and the product catalog are saved to
`data/db.json`, created automatically on first run with a few sample products
you can edit or delete from the admin dashboard.

## About the logo

Your logo is at `public/assets/logo.jpeg` and is already wired into the
navbar and browser tab icon on both the storefront and the admin dashboard.
Replace that file (keep the same name) to swap it out.

## Notes on payment and WhatsApp

There's no live payment gateway here — that matches how CliQ works in
practice: the customer transfers manually and uploads a screenshot as proof.
The "Place order" and "Send request" buttons open a pre-filled WhatsApp chat
to you so the customer can send it directly, and the screenshot is also
stored with the order for you to review in the admin dashboard.

## Project structure

```
server.js                 Express app entry point
src/db.js                 JSON-file data store (data/db.json)
src/upload.js             Multer file-upload configuration
src/middleware/auth.js    Admin session guard
src/routes/               API routes (products, orders, custom requests, admin auth)
public/index.html         Customer storefront
public/admin.html         Admin dashboard
public/css/style.css      Shared styles + animations
public/js/main.js         Storefront logic
public/js/admin.js        Admin dashboard logic
public/assets/logo.jpeg   Your logo
uploads/                  Uploaded images (products, invoices, requests)
data/db.json              Data (auto-created on first run)
```

## Swapping in a real database later

Everything reads and writes through the functions in `src/db.js`
(`load()` / `persist()`). Swap that file for a real database client and the
routes don't need to change.
