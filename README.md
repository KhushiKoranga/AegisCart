# AegisCart

An e-commerce app with **safe inventory handling under heavy traffic** and an **AI Virtual Try-On** feature. Built as a college DBMS project: React Native (Expo) app, Node.js + Express API, and **PostgreSQL as the only database**.

## Features
- Customers: register/login, browse, search, filter by category and price, flash-sale prices, size and colour selection, cart, wishlist, address book, checkout with Razorpay, order history, notifications.
- Virtual Try-On: upload or take a photo (with consent), see a garment on yourself, try other outfits and colours using the same photo, compare previews, save favourites, delete images.
- Admin (separate login and role-checked API): dashboard and sales report, products, categories, images, variants and stock, orders and status, flash sales, inventory log.
- Reliable orders: stock is reserved in one transaction, unpaid orders expire and give stock back, payments are verified with signatures, webhooks are idempotent.

## Technology
React Native + Expo + React Navigation (JavaScript) - Node.js + Express (CommonJS) - PostgreSQL via `pg` - Razorpay - Firebase Cloud Messaging (push only) - Nodemailer - Replicate (IDM-VTON model) for the AI try-on - `bcryptjs` (bcrypt algorithm, no native build) and JWT.

## Folder structure
```
aegiscart/
├── mobile/            Expo app: src/{navigation,screens,components,services,hooks,context,utils,constants}
├── backend/
│   ├── src/           routes -> controllers (thin) -> services (business logic + SQL)
│   │   ├── config/ middleware/ validators/ utils/ jobs/
│   ├── scripts/       createAdmin.js
│   └── tests/
├── database/          schema.sql, seed.sql, README.md
└── docs/              ER_DIAGRAM.md, API_DOCUMENTATION.md, SETUP_GUIDE.md
```
There is no separate `repositories/` folder: SQL lives directly in the service files so a student can read one file to follow one feature.

## Prerequisites
Node.js 18 or newer, PostgreSQL 14+, the Expo Go app (or an emulator).

## Installation
```bash
# 1. Database
createdb aegiscart
psql "postgresql://postgres:PASSWORD@localhost:5432/aegiscart" -f database/schema.sql
psql "postgresql://postgres:PASSWORD@localhost:5432/aegiscart" -f database/seed.sql

# 2. Backend
cd backend
npm install
cp .env.example .env        # then edit .env (at least DATABASE_URL and JWT_ACCESS_SECRET)
npm run create-admin        # creates the admin login from ADMIN_EMAIL / ADMIN_PASSWORD
npm start                   # http://localhost:5000/api/health

# 3. Mobile app
cd ../mobile
npm install
npx expo install --fix      # aligns package versions with your Expo version
cp .env.example .env        # set EXPO_PUBLIC_API_URL
npx expo start
```
`EXPO_PUBLIC_API_URL`: Android emulator `http://10.0.2.2:5000/api`; iOS simulator `http://localhost:5000/api`; real phone `http://<your-computer-LAN-IP>:5000/api` (same Wi-Fi).

The required environment variables are only `DATABASE_URL` and `JWT_ACCESS_SECRET`. Razorpay, email, Firebase and the AI provider are optional until you want those features. Setup steps for each: `docs/SETUP_GUIDE.md`.

## Running the tests
```bash
cd backend
npm install
npm test                                   # unit tests only; database tests are skipped

# Including the PostgreSQL tests (use an EMPTY test database, its tables are recreated!)
createdb aegiscart_test
TEST_DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/aegiscart_test npm test
```
The database tests cover registration/login, refresh-token reuse, admin access control, product listing, cart validation, 50 simultaneous buyers of the last item, rollback of a failed order, idempotent checkout, reservation expiry, payment verification, duplicate webhooks and private try-on access.

## Test status (honest report)
In the environment where this code was written there was no PostgreSQL and no internet access, so dependencies could not be installed. What was actually run:
- `node --check` on every backend file: passed.
- Unit tests (`razorpaySignature.test.js`, `validators.test.js`): 10 tests passed.
- The mobile files were checked for JSX syntax errors, missing files and missing exports: no problems found.

**Not run:** the PostgreSQL test suites, the schema and seed scripts, the Expo app, Razorpay, Firebase, email and the AI provider. Expect to fix small issues the first time you run them; please run the database tests first.

## How stock reservation works (simple example)
Stock is stored per variant (size + colour) in `product_variants.stock_quantity`. A variant has **1 item left** and customers A and B press "Place order" at the same moment. Each request opens a transaction and runs:

```sql
UPDATE product_variants
SET stock_quantity = stock_quantity - 1
WHERE id = 13 AND stock_quantity >= 1
RETURNING stock_quantity;
```
PostgreSQL locks the row for A. B's identical statement waits. When A commits, the stock is 0; B's `WHERE stock_quantity >= 1` is now false, so **0 rows change** and B gets "out of stock". Checking and subtracting happen in *one* statement, so there is no gap for a second buyer. A `CHECK (stock_quantity >= 0)` is a second safety net.

Order flow (`orderService.createOrder` -> `inventoryService`):
1. Add to cart: no reservation.
2. Checkout (`POST /orders`): one transaction reserves every item (in variant-id order, so two orders cannot deadlock each other), saves the order with copied prices, and writes `inventory_logs`. If any item is short, `ROLLBACK` undoes everything.
3. The order is `PENDING_PAYMENT` for `RESERVATION_MINUTES` (15). Payment happens outside any database transaction.
4. Paid: order becomes `CONFIRMED`. Not paid in time (or cancelled): a background job (or the cancel call) changes the status first and only then returns the stock, so stock is returned **once**.
5. Retries: the same `Idempotency-Key` returns the same order instead of creating another. A `UNIQUE (user_id, idempotency_key)` constraint guards even simultaneous duplicates.
6. A deadlock or serialization error (`40P01`, `40001`) makes `runInTransaction` retry the whole transaction up to 3 times. PostgreSQL detects deadlocks and aborts one transaction; it does not prevent them, which is why consistent lock order is used.

**Payment safety.** The app's "payment success" message is never trusted. Marking an order paid happens only after the Razorpay signature is verified (`/payments/verify`) or a signed webhook arrives. If a payment arrives *after* the reservation expired, the server tries to reserve the stock again; if the items are gone, the payment is marked `NEEDS_REFUND` (a database rollback cannot undo real money), and the admin refunds it in Razorpay. A background job also asks Razorpay about unconfirmed payments (reconciliation).

## DBMS concepts demonstrated (for your viva)
- **Primary key**: unique id of a row (`id` columns). **Foreign key**: a column that points to another table's key, keeping data consistent (**referential integrity**), e.g. `order_items.order_id -> orders.id`; `ON DELETE CASCADE/SET NULL` decides what happens to children.
- **One-to-many**: category -> products, user -> orders. **Many-to-many**: users <-> products (wishlist) and orders <-> variants (`order_items`); resolved with a link table.
- **Normalization**: remove repeated data (1NF-3NF) - see `docs/ER_DIAGRAM.md`, including why `order_items` deliberately copies the price.
- **Constraints**: `CHECK`, `UNIQUE`, `NOT NULL` make the database reject bad data even if the app has a bug.
- **Transaction and ACID**: *Atomicity* - an order with 3 items is saved fully or not at all (`BEGIN/COMMIT/ROLLBACK`). *Consistency* - constraints always hold (stock never negative). *Isolation* - simultaneous buyers do not see half-finished work (row locks). *Durability* - committed orders survive a crash.
- **Concurrency control**: row-level locks taken by `UPDATE` / `SELECT ... FOR UPDATE`; consistent lock order; retry on deadlock.
- **Atomic SQL update**: the conditional `UPDATE ... WHERE stock_quantity >= n` above.
- **Idempotency**: repeating a request has the same effect as doing it once (idempotency key, webhook event ids).
- **Indexing and query optimisation**: indexes on filtered/joined columns, a partial index for pending orders, price logic written once in SQL, filters done in the database instead of in JavaScript, parameterized queries (also stops SQL injection).

## Decisions I made where the brief was open
- Flash sales use a fixed `sale_price` (the schema already had this); the lowest active price wins.
- One payment row per order. A retry reuses the same Razorpay order.
- "Delete product": allowed only if it is in no order or try-on history; otherwise the admin hides it.
- Cancelling a paid order (admin) returns the stock and marks the payment `NEEDS_REFUND`; the refund itself is done in the Razorpay dashboard.
- Customer and admin logins are separate endpoints; an admin account cannot use the customer login and vice versa. The role is also checked by the backend on every `/api/admin` request.
- The Razorpay checkout runs in a WebView so it works in Expo Go.
- Order confirmation is shown on the Payment Status screen (success state) instead of a separate screen. Product reviews and ratings were not implemented (they were optional).

## Known limitations
- Not run end to end (see "Test status").
- Push notifications need a development build and Firebase files (not Expo Go).
- Refunds and a "refunded" status are manual. Customers cannot request returns.
- Private images are stored on the server's disk, which is not suitable for several servers; swap `storageService.js` for cloud storage.
- Name search uses `ILIKE` without a trigram index. No pagination UI (the API supports `page`/`limit`).
- The access token carries the role for 15 minutes, so a demoted admin keeps access until it expires.
- Try-on quality depends on the AI model, the photo and the garment image; results are previews, not exact fits.

## Troubleshooting
| Problem | Fix |
|---|---|
| "Missing required environment variables" | Copy `backend/.env.example` to `backend/.env` and fill `DATABASE_URL` and `JWT_ACCESS_SECRET`. |
| "Cannot connect to PostgreSQL" | Start PostgreSQL; check user, password and database name in `DATABASE_URL`. |
| App says "Cannot reach the server" | Wrong `EXPO_PUBLIC_API_URL`; on a real phone use your computer's LAN IP and allow port 5000 in the firewall. Restart `expo start` after editing `.env`. |
| Admin login fails | Run `npm run create-admin` and use the admin login screen, not the customer one. |
| `sharp` install problems | Use a recent Node LTS and run `npm install` again (it downloads a prebuilt binary). |
| Payment 503 "not set up" | Add the Razorpay keys to `backend/.env` and restart the backend. |
| Try-on 503 "not set up" | Set `REPLICATE_API_TOKEN` and `REPLICATE_MODEL_VERSION` (docs/SETUP_GUIDE.md). |
| Try-on always fails | Garment image URL must be public and show a clear garment; seed placeholders will not work. |
| Package version warnings in Expo | Run `npx expo install --fix` inside `mobile/`. |
