const { query } = require('../config/database');

// Orders that were paid for. Cancelled and expired orders are not revenue.
const PAID_STATUSES = "('CONFIRMED', 'SHIPPED', 'DELIVERED')";
const LOW_STOCK_LIMIT = 5;

async function getDashboardStats() {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') AS customers,
       (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS active_products,
       (SELECT COUNT(*) FROM orders WHERE status IN ${PAID_STATUSES}) AS paid_orders,
       (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ${PAID_STATUSES}) AS revenue,
       (SELECT COUNT(*) FROM orders WHERE status = 'CONFIRMED') AS orders_to_ship,
       (SELECT COUNT(*) FROM product_variants WHERE stock_quantity <= $1) AS low_stock_variants,
       (SELECT COUNT(*) FROM payments WHERE status = 'NEEDS_REFUND') AS payments_needing_refund`,
    [LOW_STOCK_LIMIT]
  );
  return result.rows[0];
}

async function getSalesReport(days) {
  const daily = await query(
    `SELECT created_at::date AS day, COUNT(*) AS orders, SUM(total_amount) AS revenue
     FROM orders
     WHERE status IN ${PAID_STATUSES} AND created_at >= NOW() - make_interval(days => $1)
     GROUP BY created_at::date ORDER BY day DESC`,
    [days]
  );
  const topProducts = await query(
    `SELECT oi.product_name, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.unit_price) AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status IN ${PAID_STATUSES} AND o.created_at >= NOW() - make_interval(days => $1)
     GROUP BY oi.product_name ORDER BY units_sold DESC LIMIT 5`,
    [days]
  );
  return { days, daily: daily.rows, topProducts: topProducts.rows };
}

async function listCustomers() {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at,
            COUNT(o.id) FILTER (WHERE o.status IN ${PAID_STATUSES}) AS paid_orders
     FROM users u LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role = 'CUSTOMER'
     GROUP BY u.id ORDER BY u.id DESC LIMIT 200`
  );
  return result.rows;
}

module.exports = { getDashboardStats, getSalesReport, listCustomers };
