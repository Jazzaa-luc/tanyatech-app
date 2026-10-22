# TanyaTech — 3D Printing Storefront + Admin Dashboard

A Node.js (Express) web app for a 3D printing business: a login-free customer
storefront and a password-protected admin dashboard, built around WhatsApp as
the hand-off point for orders and custom print requests.

## What's included

**Customer side** (`/`)
- Navbar: Products (with a category dropdown), Tanya Coloring, Services, About Us, Policy
- Product catalog with categories, colors, images, add-to-cart — no account needed
- Cart with a 5 JD order minimum and free delivery from 30 JD (both set in `src/settings.js`)
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
- For a live site: a PostgreSQL database (see Database)

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

Orders, custom requests, promo codes, the product catalog **and every uploaded
picture** (products, payment screenshots, reference photos) are stored in a
PostgreSQL database, set up automatically on first run with a few sample
products you can edit or delete from the admin dashboard. See **Database**
below.

## Database

Without any setup, `npm start` keeps a small local database in `data/pgdata/`,
which is fine on your own computer.

**On a live host that erases its files on every restart (Render's free plan
does) you must connect an online PostgreSQL database**, otherwise orders,
products and pictures are lost. Until you do, the admin dashboard shows a red
"Your data is not being saved permanently" warning.

Free option: [Neon](https://neon.com) (1 GB, no expiry). Do not use Render's own
free Postgres: it expires after 30 days.

1. Create a Neon account and a new project (pick the region closest to your
   Render service).
2. Open the project's **Connect** panel and copy the connection string. It
   starts with `postgresql://` and ends with `?sslmode=require`.
3. In Render: your service → **Environment** → add a variable named
   `DATABASE_URL` with that string → save. Render redeploys by itself.
4. Open `/admin`: the red warning should be gone. Add a test product, then
   restart the service from Render: the product must still be there.

The tables are created automatically. The very first start fills the database
with the sample products (once only; deleted samples never come back). If an
old `data/db.json` exists it is imported instead, together with its `uploads/`
pictures.

Good to know: pictures live in the database, so the 1 GB free limit is shared
between data and pictures. Deleting a product or replacing its picture frees the
space. To see how much is used, check the Neon dashboard.

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
src/db.js                 PostgreSQL storage: tables, first-run data, pictures
src/http.js               Async route helpers + friendly errors
src/settings.js           Minimum order and free-delivery amounts
src/upload.js             Multer file-upload configuration (pictures go to the database)
src/middleware/auth.js    Admin session guard
src/routes/               API routes (products, orders, custom requests, admin auth)
public/index.html         Customer storefront
public/admin.html         Admin dashboard
public/css/style.css      Shared styles + animations
public/js/main.js         Storefront logic
public/js/admin.js        Admin dashboard logic
public/assets/logo.jpeg   Your logo
data/pgdata/              Local database used when DATABASE_URL is not set
```
