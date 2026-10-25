-- AegisCart database schema (PostgreSQL only)
-- Run: psql "$DATABASE_URL" -f database/schema.sql

-- Re-running this file in development: drop old tables first (children before parents).
DROP TABLE IF EXISTS saved_tryon_results, virtual_tryon_history, tryon_photos, inventory_logs,
  notifications, payment_events, payments, order_items, orders, flash_sales, wishlists,
  cart_items, product_images, product_variants, products, categories, addresses,
  refresh_tokens, users CASCADE;

-- Users: customers and admins share one table, role decides permissions.
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(10) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  fcm_token     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only a hash of the refresh token is stored, never the token itself.
CREATE TABLE refresh_tokens (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- One user has many addresses (1:M).
CREATE TABLE addresses (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name  VARCHAR(100) NOT NULL,
  phone      VARCHAR(20) NOT NULL,
  line1      VARCHAR(200) NOT NULL,
  line2      VARCHAR(200),
  city       VARCHAR(80) NOT NULL,
  state      VARCHAR(80) NOT NULL,
  pincode    VARCHAR(10) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- One category has many products (1:M).
CREATE TABLE categories (
  id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id),
  name        VARCHAR(150) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_price  NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,   -- hidden products are not shown to customers
  -- Garment type sent to the AI model. NULL means this product cannot be tried on.
  try_on_category VARCHAR(20) CHECK (try_on_category IN ('upper_body','lower_body','dresses')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock lives on the variant (size + colour), not on the product.
-- CHECK (stock_quantity >= 0) means the database itself refuses negative stock.
CREATE TABLE product_variants (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id        BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size              VARCHAR(20) NOT NULL,
  color             VARCHAR(40) NOT NULL,
  stock_quantity    INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  garment_image_url TEXT,                       -- image of this exact colour, used by Virtual Try-On
  UNIQUE (product_id, size, color)
);

CREATE TABLE product_images (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE cart_items (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INT NOT NULL CHECK (quantity > 0),
  UNIQUE (user_id, variant_id)
);

-- Wishlist is a many-to-many link between users and products.
CREATE TABLE wishlists (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE flash_sales (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (ends_at > starts_at)
);

-- shipping_address is a snapshot on purpose: an old order must not change
-- when the customer edits or deletes an address later.
CREATE TABLE orders (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                BIGINT NOT NULL REFERENCES users(id),
  address_id             BIGINT REFERENCES addresses(id) ON DELETE SET NULL,
  shipping_address       TEXT NOT NULL,
  status                 VARCHAR(20) NOT NULL DEFAULT 'PENDING_PAYMENT'
                         CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','EXPIRED')),
  total_amount           NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  idempotency_key        VARCHAR(100) NOT NULL,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)             -- a retried checkout cannot create a second order
);

-- order_items resolves the many-to-many link between orders and products.
-- Name and price are copied here so old orders keep their original values.
CREATE TABLE order_items (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   BIGINT NOT NULL REFERENCES product_variants(id),
  product_name VARCHAR(150) NOT NULL,
  size         VARCHAR(20) NOT NULL,
  color        VARCHAR(40) NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity     INT NOT NULL CHECK (quantity > 0)
);

CREATE TABLE payments (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id            BIGINT NOT NULL UNIQUE REFERENCES orders(id),
  razorpay_order_id   VARCHAR(60) NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(60),
  amount              NUMERIC(10,2) NOT NULL,
  -- NEEDS_REFUND: money was received but the order had already expired or was cancelled.
  status              VARCHAR(20) NOT NULL DEFAULT 'CREATED'
                      CHECK (status IN ('CREATED','PAID','FAILED','NEEDS_REFUND')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every webhook event id is stored once, so a retried webhook is ignored.
CREATE TABLE payment_events (
  event_id    VARCHAR(100) PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(150) NOT NULL,
  body       TEXT NOT NULL,
  type       VARCHAR(40) NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit trail of every stock change.
CREATE TABLE inventory_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variant_id    BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  order_id      BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  changed_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,   -- set for admin changes
  change_amount INT NOT NULL,                                     -- negative = stock taken
  stock_after   INT NOT NULL CHECK (stock_after >= 0),
  reason        VARCHAR(40) NOT NULL CHECK (reason IN ('RESERVED','RELEASED','ADMIN_ADJUSTMENT')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Virtual Try-On: images are private files, only their storage paths are stored here.
-- One uploaded photo can be used for many outfits (1:M), so it has its own table.
CREATE TABLE tryon_photos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_path    TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL CHECK (consent_given),   -- customer agreed to AI processing
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per generated preview. The status moves: pending -> processing -> completed/failed.
CREATE TABLE virtual_tryon_history (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id          BIGINT REFERENCES tryon_photos(id) ON DELETE SET NULL,
  product_id        BIGINT NOT NULL REFERENCES products(id),
  variant_id        BIGINT NOT NULL REFERENCES product_variants(id),
  result_image_path TEXT,
  status            VARCHAR(12) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed')),
  provider_job_id   VARCHAR(100),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_tryon_results (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tryon_id   BIGINT NOT NULL REFERENCES virtual_tryon_history(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tryon_id)
);

-- Indexes for the queries the app runs most often.
CREATE INDEX idx_products_category        ON products(category_id);
CREATE INDEX idx_variants_product         ON product_variants(product_id);
CREATE INDEX idx_cart_items_user          ON cart_items(user_id);
CREATE INDEX idx_orders_user_created      ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_pending_expiry    ON orders(reservation_expires_at) WHERE status = 'PENDING_PAYMENT';
CREATE INDEX idx_order_items_order        ON order_items(order_id);
CREATE INDEX idx_inventory_logs_variant   ON inventory_logs(variant_id);
CREATE INDEX idx_flash_sales_product      ON flash_sales(product_id, starts_at, ends_at);
CREATE INDEX idx_products_name            ON products(name);   -- note: ILIKE '%text%' search cannot use this btree index
CREATE INDEX idx_tryon_photos_user         ON tryon_photos(user_id);
CREATE INDEX idx_tryon_user_created       ON virtual_tryon_history(user_id, created_at DESC);
CREATE INDEX idx_notifications_user       ON notifications(user_id, created_at DESC);
