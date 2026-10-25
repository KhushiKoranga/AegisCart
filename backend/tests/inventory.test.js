// Needs PostgreSQL: set TEST_DATABASE_URL to an empty test database (its tables are recreated).
const test = require('node:test');
const assert = require('node:assert');
const helper = require('./helpers/testDatabase');

const skip = helper.testDatabaseUrl ? false : 'Set TEST_DATABASE_URL to run database tests';

test('inventory and order transactions', { skip }, async (t) => {
  helper.prepareEnvironment();
  const { query, runInTransaction } = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const orderService = require('../src/services/orderService');

  t.after(helper.finish);
  await helper.resetDatabase();

  const jacket = (await query('SELECT id FROM product_variants WHERE product_id = 6')).rows[0];

  await t.test('50 buyers fight for the last item: exactly one wins', async () => {
    const attempts = Array.from({ length: 50 }, () =>
      runInTransaction((tx) => inventoryService.reserveStock(tx, { variantId: jacket.id, quantity: 1 }))
        .then(() => 'reserved', (error) => error.code)
    );
    const results = await Promise.all(attempts);

    assert.strictEqual(results.filter((result) => result === 'reserved').length, 1);
    assert.strictEqual(results.filter((result) => result === 'OUT_OF_STOCK').length, 49);

    const stock = (await query('SELECT stock_quantity FROM product_variants WHERE id = $1', [jacket.id])).rows[0].stockQuantity;
    assert.strictEqual(stock, 0);
  });

  await t.test('stock can never go below zero', async () => {
    await assert.rejects(
      runInTransaction((tx) => inventoryService.reserveStock(tx, { variantId: jacket.id, quantity: 1 })),
      { code: 'OUT_OF_STOCK' }
    );
  });

  await t.test('a failed order rolls back everything, including stock taken for earlier items', async () => {
    const user = (await query("INSERT INTO users (name, email, password_hash) VALUES ('T', 't@test.com', 'x') RETURNING id")).rows[0];
    const address = (await query(
      `INSERT INTO addresses (user_id, full_name, phone, line1, city, state, pincode)
       VALUES ($1, 'T', '1', 'Street', 'City', 'State', '100001') RETURNING id`, [user.id])).rows[0];
    const shirt = (await query('SELECT id, stock_quantity FROM product_variants WHERE product_id = 3 ORDER BY id LIMIT 1')).rows[0];

    // The shirt is available, the jacket is already sold out. The whole order must fail.
    await query('INSERT INTO cart_items (user_id, variant_id, quantity) VALUES ($1, $2, 1), ($1, $3, 1)', [user.id, shirt.id, jacket.id]);

    await assert.rejects(
      orderService.createOrder(user.id, { addressId: address.id, idempotencyKey: 'key-1' }),
      { code: 'OUT_OF_STOCK' }
    );

    const stockAfter = (await query('SELECT stock_quantity FROM product_variants WHERE id = $1', [shirt.id])).rows[0].stockQuantity;
    assert.strictEqual(stockAfter, shirt.stockQuantity);
    assert.strictEqual((await query('SELECT COUNT(*) AS total FROM orders')).rows[0].total, 0);
  });

  await t.test('retrying checkout with the same idempotency key returns the same order', async () => {
    const user = (await query("SELECT id FROM users WHERE email = 't@test.com'")).rows[0];
    const address = (await query('SELECT id FROM addresses WHERE user_id = $1', [user.id])).rows[0];
    await query('DELETE FROM cart_items WHERE user_id = $1', [user.id]);
    const shirt = (await query('SELECT id FROM product_variants WHERE product_id = 3 ORDER BY id LIMIT 1')).rows[0];
    await query('INSERT INTO cart_items (user_id, variant_id, quantity) VALUES ($1, $2, 2)', [user.id, shirt.id]);

    const first = await orderService.createOrder(user.id, { addressId: address.id, idempotencyKey: 'key-2' });
    const second = await orderService.createOrder(user.id, { addressId: address.id, idempotencyKey: 'key-2' });
    assert.strictEqual(first.id, second.id);
    assert.strictEqual((await query('SELECT COUNT(*) AS total FROM orders')).rows[0].total, 1);
  });

  await t.test('expired unpaid orders give their stock back exactly once', async () => {
    const order = (await query('SELECT id FROM orders LIMIT 1')).rows[0];
    const shirt = (await query('SELECT id FROM product_variants WHERE product_id = 3 ORDER BY id LIMIT 1')).rows[0];
    const stockBefore = (await query('SELECT stock_quantity FROM product_variants WHERE id = $1', [shirt.id])).rows[0].stockQuantity;

    await query("UPDATE orders SET reservation_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1", [order.id]);
    assert.strictEqual(await orderService.expireUnpaidOrders(), 1);
    assert.strictEqual(await orderService.expireUnpaidOrders(), 0); // second run changes nothing

    const stockAfter = (await query('SELECT stock_quantity FROM product_variants WHERE id = $1', [shirt.id])).rows[0].stockQuantity;
    assert.strictEqual(stockAfter, stockBefore + 2);
  });
});
