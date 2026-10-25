// Admin changes to categories, products, product images and variants.
const { query, runInTransaction } = require('../config/database');
const AppError = require('../utils/AppError');
const inventoryService = require('./inventoryService');

// ---------- categories ----------

async function createCategory({ name }) {
  const result = await query('INSERT INTO categories (name) VALUES ($1) RETURNING id, name', [name]);
  return result.rows[0];
}

async function renameCategory(categoryId, { name }) {
  const result = await query('UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name', [categoryId, name]);
  if (result.rowCount === 0) throw new AppError('Category not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

async function deleteCategory(categoryId) {
  try {
    const result = await query('DELETE FROM categories WHERE id = $1', [categoryId]);
    if (result.rowCount === 0) throw new AppError('Category not found', 404, 'NOT_FOUND');
  } catch (error) {
    if (error.code === '23503') throw new AppError('This category still has products. Move or remove them first.', 409, 'CATEGORY_IN_USE');
    throw error;
  }
}

// ---------- products ----------

async function createProduct(product) {
  const result = await query(
    `INSERT INTO products (category_id, name, description, base_price, try_on_category)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [product.categoryId, product.name, product.description, product.basePrice, product.tryOnCategory]
  );
  return result.rows[0];
}

async function updateProduct(productId, product) {
  const result = await query(
    `UPDATE products SET category_id = $2, name = $3, description = $4, base_price = $5, try_on_category = $6
     WHERE id = $1 RETURNING id`,
    [productId, product.categoryId, product.name, product.description, product.basePrice, product.tryOnCategory]
  );
  if (result.rowCount === 0) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

// Hidden products disappear from the shop but stay in old orders.
async function setProductActive(productId, isActive) {
  const result = await query('UPDATE products SET is_active = $2 WHERE id = $1 RETURNING id, is_active', [productId, isActive]);
  if (result.rowCount === 0) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

async function deleteProduct(productId) {
  try {
    const result = await query('DELETE FROM products WHERE id = $1', [productId]);
    if (result.rowCount === 0) throw new AppError('Product not found', 404, 'NOT_FOUND');
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError('This product is part of orders or try-on history, so it cannot be deleted. Hide it instead.', 409, 'PRODUCT_IN_USE');
    }
    throw error;
  }
}

// ---------- product images ----------

async function addProductImage(productId, { imageUrl, sortOrder }) {
  const result = await query(
    'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3) RETURNING id, image_url, sort_order',
    [productId, imageUrl, sortOrder]
  );
  return result.rows[0];
}

async function deleteProductImage(imageId) {
  const result = await query('DELETE FROM product_images WHERE id = $1', [imageId]);
  if (result.rowCount === 0) throw new AppError('Image not found', 404, 'NOT_FOUND');
}

// ---------- variants (size + colour) ----------

async function listVariants(productId) {
  const result = await query(
    'SELECT id, size, color, stock_quantity, garment_image_url FROM product_variants WHERE product_id = $1 ORDER BY color, size',
    [productId]
  );
  return result.rows;
}

async function addVariant(productId, variant, adminId) {
  return runInTransaction(async (tx) => {
    const result = await tx.query(
      `INSERT INTO product_variants (product_id, size, color, stock_quantity, garment_image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, size, color, stock_quantity, garment_image_url`,
      [productId, variant.size, variant.color, variant.stockQuantity, variant.garmentImageUrl]
    );
    const created = result.rows[0];
    if (created.stockQuantity > 0) {
      await inventoryService.writeInventoryLog(tx, {
        variantId: created.id, changedBy: adminId, changeAmount: created.stockQuantity,
        stockAfter: created.stockQuantity, reason: 'ADMIN_ADJUSTMENT',
      });
    }
    return created;
  });
}

// Stock is not changed here. Stock changes go through inventoryService so they are logged.
async function updateVariant(variantId, variant) {
  const result = await query(
    `UPDATE product_variants SET size = $2, color = $3, garment_image_url = $4
     WHERE id = $1 RETURNING id, size, color, stock_quantity, garment_image_url`,
    [variantId, variant.size, variant.color, variant.garmentImageUrl]
  );
  if (result.rowCount === 0) throw new AppError('Variant not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

async function deleteVariant(variantId) {
  try {
    const result = await query('DELETE FROM product_variants WHERE id = $1', [variantId]);
    if (result.rowCount === 0) throw new AppError('Variant not found', 404, 'NOT_FOUND');
  } catch (error) {
    if (error.code === '23503') throw new AppError('This variant is part of orders. Set its stock to 0 instead.', 409, 'VARIANT_IN_USE');
    throw error;
  }
}

module.exports = {
  createCategory, renameCategory, deleteCategory, createProduct, updateProduct, setProductActive, deleteProduct,
  addProductImage, deleteProductImage, listVariants, addVariant, updateVariant, deleteVariant,
};
