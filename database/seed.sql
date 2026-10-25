-- Sample data for development. Run after schema.sql.
-- The admin user is created separately with: npm run create-admin (inside backend/)

INSERT INTO categories (name) VALUES ('Dresses'), ('Tops'), ('Bottoms');

INSERT INTO products (category_id, name, description, base_price, try_on_category) VALUES
  (1, 'Floral Summer Dress',   'Light cotton dress with a floral print.',  1999.00, 'dresses'),
  (1, 'Black Evening Dress',   'Simple knee-length black dress.',          2999.00, 'dresses'),
  (2, 'Classic White Shirt',   'Cotton shirt for everyday wear.',           999.00, 'upper_body'),
  (2, 'Striped Casual Tee',    'Soft cotton t-shirt with thin stripes.',    599.00, 'upper_body'),
  (3, 'Blue Denim Jeans',      'Straight fit denim jeans.',                1499.00, 'lower_body'),
  (2, 'Limited Edition Jacket','Only one piece in stock. Used to demonstrate the last-item race.', 4999.00, 'upper_body');

-- placehold.co gives simple placeholder pictures so the app has something to show.
-- Replace them with real photos of garments (plain background) before testing Virtual Try-On.
INSERT INTO product_images (product_id, image_url, sort_order) VALUES
  (1, 'https://placehold.co/600x800/png?text=Floral+Dress', 0),
  (2, 'https://placehold.co/600x800/png?text=Black+Dress', 0),
  (3, 'https://placehold.co/600x800/png?text=White+Shirt', 0),
  (4, 'https://placehold.co/600x800/png?text=Striped+Tee', 0),
  (5, 'https://placehold.co/600x800/png?text=Blue+Jeans', 0),
  (6, 'https://placehold.co/600x800/png?text=Limited+Jacket', 0);

-- Stock is kept per variant (size + colour). Each colour has its own garment image.
INSERT INTO product_variants (product_id, size, color, stock_quantity, garment_image_url) VALUES
  (1, 'M', 'Red',   10, 'https://placehold.co/600x800/png?text=Dress+Red'),
  (1, 'L', 'Red',    1, 'https://placehold.co/600x800/png?text=Dress+Red'),
  (1, 'M', 'Blue',   5, 'https://placehold.co/600x800/png?text=Dress+Blue'),
  (2, 'M', 'Black',  8, 'https://placehold.co/600x800/png?text=Dress+Black'),
  (2, 'L', 'Black',  8, 'https://placehold.co/600x800/png?text=Dress+Black'),
  (3, 'M', 'White', 20, 'https://placehold.co/600x800/png?text=Shirt+White'),
  (3, 'L', 'White', 20, 'https://placehold.co/600x800/png?text=Shirt+White'),
  (3, 'M', 'Blue',  12, NULL),                -- no garment image: try-on is not offered for this colour
  (4, 'M', 'Navy',  15, 'https://placehold.co/600x800/png?text=Tee+Navy'),
  (4, 'L', 'Navy',  15, 'https://placehold.co/600x800/png?text=Tee+Navy'),
  (5, '32', 'Blue', 15, 'https://placehold.co/600x800/png?text=Jeans+Blue'),
  (5, '34', 'Blue', 15, 'https://placehold.co/600x800/png?text=Jeans+Blue'),
  (6, 'M', 'Black',  1, 'https://placehold.co/600x800/png?text=Jacket+Black');

INSERT INTO flash_sales (product_id, sale_price, starts_at, ends_at) VALUES
  (2, 1999.00, NOW(), NOW() + INTERVAL '7 days'),
  (6, 3999.00, NOW(), NOW() + INTERVAL '7 days');
