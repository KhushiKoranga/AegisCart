// SQL pieces shared by every query that needs the price a customer pays right now.
// Use them in queries where the products table is aliased as "p".

// Finds the cheapest active flash sale for the product (if there is one).
const FLASH_SALE_JOIN = `
  LEFT JOIN LATERAL (
    SELECT sale_price FROM flash_sales
    WHERE product_id = p.id AND is_active = TRUE AND NOW() BETWEEN starts_at AND ends_at
    ORDER BY sale_price
    LIMIT 1
  ) AS fs ON TRUE`;

// The sale price when a sale is running, otherwise the normal price.
const CURRENT_PRICE = 'LEAST(p.base_price, COALESCE(fs.sale_price, p.base_price))';

// First picture of a product, used as its thumbnail.
const PRIMARY_IMAGE = '(SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1)';

module.exports = { FLASH_SALE_JOIN, CURRENT_PRICE, PRIMARY_IMAGE };
