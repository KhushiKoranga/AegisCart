// Needs PostgreSQL: set TEST_DATABASE_URL to an empty test database (its tables are recreated).
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const helper = require('./helpers/testDatabase');

const skip = helper.testDatabaseUrl ? false : 'Set TEST_DATABASE_URL to run database tests';

function signWebhook(rawBody) {
  return crypto.createHmac('sha256', 'test_webhook_secret').update(rawBody).digest('hex');
}

test('HTTP API', { skip }, async (t) => {
  helper.prepareEnvironment();
  const request = require('supertest');
  const bcrypt = require('bcryptjs');
  const { query } = require('../src/config/database');
  const app = require('../src/app');

  t.after(helper.finish);
  await helper.resetDatabase();

  async function register(email) {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test User', email, password: 'password123' });
    return response.body.data;
  }
  const authHeader = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

  await t.test('registration, duplicate email and login', async () => {
    const created = await request(app).post('/api/auth/register').send({ name: 'Asha', email: 'asha@test.com', password: 'password123' });
    assert.strictEqual(created.status, 201);
    assert.ok(created.body.data.accessToken);
    assert.strictEqual(created.body.data.user.passwordHash, undefined);

    const duplicate = await request(app).post('/api/auth/register').send({ name: 'Asha', email: 'asha@test.com', password: 'password123' });
    assert.strictEqual(duplicate.status, 409);

    const goodLogin = await request(app).post('/api/auth/login').send({ email: 'asha@test.com', password: 'password123' });
    assert.strictEqual(goodLogin.status, 200);
    const badLogin = await request(app).post('/api/auth/login').send({ email: 'asha@test.com', password: 'wrong-password' });
    assert.strictEqual(badLogin.status, 401);
  });

  await t.test('refresh tokens can be used only once', async () => {
    const session = await register('refresh@test.com');
    const first = await request(app).post('/api/auth/refresh').send({ refreshToken: session.refreshToken });
    assert.strictEqual(first.status, 200);
    const reused = await request(app).post('/api/auth/refresh').send({ refreshToken: session.refreshToken });
    assert.strictEqual(reused.status, 401);
  });

  await t.test('admin routes: no token = 401, customer = 403, admin = 200', async () => {
    assert.strictEqual((await request(app).get('/api/admin/dashboard')).status, 401);

    const customer = await register('customer@test.com');
    assert.strictEqual((await request(app).get('/api/admin/dashboard').set(authHeader(customer))).status, 403);

    // A customer cannot use the admin login either.
    const customerOnAdminLogin = await request(app).post('/api/auth/admin/login').send({ email: 'customer@test.com', password: 'password123' });
    assert.strictEqual(customerOnAdminLogin.status, 401);

    await query("INSERT INTO users (name, email, password_hash, role) VALUES ('Boss', 'boss@test.com', $1, 'ADMIN')", [bcrypt.hashSync('password123', 4)]);
    const adminLogin = await request(app).post('/api/auth/admin/login').send({ email: 'boss@test.com', password: 'password123' });
    assert.strictEqual(adminLogin.status, 200);
    assert.strictEqual((await request(app).get('/api/admin/dashboard').set(authHeader(adminLogin.body.data))).status, 200);
  });

  await t.test('product listing, search and price filter', async () => {
    const all = await request(app).get('/api/products');
    assert.strictEqual(all.status, 200);
    assert.ok(all.body.data.length >= 6);

    const search = await request(app).get('/api/products?search=jeans');
    assert.strictEqual(search.body.data.length, 1);

    const cheap = await request(app).get('/api/products?maxPrice=700');
    assert.ok(cheap.body.data.every((product) => product.currentPrice <= 700));

    assert.strictEqual((await request(app).get('/api/products/99999')).status, 404);
    assert.strictEqual((await request(app).get('/api/products?minPrice=abc')).status, 400);
  });

  await t.test('cart validates quantity and stock', async () => {
    const session = await register('cart@test.com');
    const variant = (await query('SELECT id FROM product_variants WHERE product_id = 3 ORDER BY id LIMIT 1')).rows[0];
    const addItem = (body) => request(app).post('/api/cart/items').set(authHeader(session)).send(body);

    assert.strictEqual((await addItem({ variantId: variant.id, quantity: 0 })).status, 400);
    assert.strictEqual((await addItem({ variantId: variant.id, quantity: 11 })).status, 400);
    assert.strictEqual((await addItem({ variantId: 999999, quantity: 1 })).status, 404);
    assert.strictEqual((await addItem({ variantId: variant.id, quantity: 2 })).status, 201);

    const cart = await request(app).get('/api/cart').set(authHeader(session));
    assert.strictEqual(cart.body.data.itemCount, 2);
    assert.strictEqual(cart.body.data.subtotal, 1998);
  });

  await t.test('virtual try-on: validation, setup message and private access', async () => {
    const owner = await register('owner@test.com');
    const other = await register('other@test.com');

    const noConsent = await request(app).post('/api/virtual-try-on/photos').set(authHeader(owner)).attach('photo', Buffer.from('fake'), 'p.jpg');
    assert.strictEqual(noConsent.status, 400);

    const wrongType = await request(app).post('/api/virtual-try-on/photos').set(authHeader(owner))
      .field('consentGiven', 'true').attach('photo', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    assert.strictEqual(wrongType.status, 400);

    assert.strictEqual((await request(app).post('/api/virtual-try-on').set(authHeader(owner)).send({ productId: 1 })).status, 400);

    // No AI provider is configured in tests, so a valid request gets a clear setup message.
    const notConfigured = await request(app).post('/api/virtual-try-on').set(authHeader(owner)).send({ photoId: 1, productId: 1 });
    assert.strictEqual(notConfigured.status, 503);
    assert.strictEqual(notConfigured.body.code, 'TRYON_NOT_CONFIGURED');

    // A completed try-on that belongs to "owner". "other" must not be able to see it.
    const ownerId = (await query("SELECT id FROM users WHERE email = 'owner@test.com'")).rows[0].id;
    const variantId = (await query('SELECT id FROM product_variants WHERE product_id = 1 ORDER BY id LIMIT 1')).rows[0].id;
    const record = (await query(
      `INSERT INTO virtual_tryon_history (user_id, product_id, variant_id, status, result_image_path)
       VALUES ($1, 1, $2, 'completed', 'results/none.jpg') RETURNING id`, [ownerId, variantId])).rows[0];

    assert.strictEqual((await request(app).get(`/api/virtual-try-on/${record.id}`).set(authHeader(owner))).status, 200);
    assert.strictEqual((await request(app).get(`/api/virtual-try-on/${record.id}`).set(authHeader(other))).status, 404);
    assert.strictEqual((await request(app).get(`/api/virtual-try-on/${record.id}/image`).set(authHeader(other))).status, 404);
    assert.strictEqual((await request(app).post(`/api/virtual-try-on/${record.id}/save`).set(authHeader(other))).status, 404);
    assert.strictEqual((await request(app).delete(`/api/virtual-try-on/${record.id}`).set(authHeader(other))).status, 404);
    assert.strictEqual((await request(app).get(`/api/virtual-try-on/${record.id}`)).status, 401);
  });

  await t.test('payments: bad signature rejected, webhook marks paid once, duplicate event ignored', async () => {
    const session = await register('payer@test.com');
    const userId = (await query("SELECT id FROM users WHERE email = 'payer@test.com'")).rows[0].id;
    const address = (await request(app).post('/api/addresses').set(authHeader(session))
      .send({ fullName: 'Payer', phone: '9999999999', line1: '1 Road', city: 'Agra', state: 'UP', pincode: '282001' })).body.data;
    const variant = (await query('SELECT id FROM product_variants WHERE product_id = 4 ORDER BY id LIMIT 1')).rows[0];
    await request(app).post('/api/cart/items').set(authHeader(session)).send({ variantId: variant.id, quantity: 1 });

    const orderResponse = await request(app).post('/api/orders').set(authHeader(session)).set('Idempotency-Key', 'pay-key-1').send({ addressId: address.id });
    assert.strictEqual(orderResponse.status, 201);
    const orderId = orderResponse.body.data.id;
    assert.strictEqual(orderResponse.body.data.status, 'PENDING_PAYMENT');

    // Pretend Razorpay already created a payment order (we do not call the real Razorpay in tests).
    await query("INSERT INTO payments (order_id, razorpay_order_id, amount) VALUES ($1, 'order_test_1', 599)", [orderId]);

    const badVerify = await request(app).post('/api/payments/verify').set(authHeader(session))
      .send({ razorpayOrderId: 'order_test_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'fake' });
    assert.strictEqual(badVerify.status, 400);
    assert.strictEqual((await query('SELECT status FROM orders WHERE id = $1', [orderId])).rows[0].status, 'PENDING_PAYMENT');

    const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_test_1' } } } });
    const sendWebhook = (signature) => request(app).post('/api/payments/webhook')
      .set('Content-Type', 'application/json').set('x-razorpay-event-id', 'evt_1').set('x-razorpay-signature', signature).send(rawBody);

    assert.strictEqual((await sendWebhook('wrong-signature')).status, 400);

    assert.strictEqual((await sendWebhook(signWebhook(rawBody))).status, 200);
    assert.strictEqual((await query('SELECT status FROM orders WHERE id = $1', [orderId])).rows[0].status, 'CONFIRMED');

    // Razorpay retries the same event: nothing changes and no error is returned.
    assert.strictEqual((await sendWebhook(signWebhook(rawBody))).status, 200);
    assert.strictEqual((await query("SELECT COUNT(*) AS total FROM payment_events WHERE event_id = 'evt_1'")).rows[0].total, 1);
    assert.strictEqual((await query('SELECT status FROM payments WHERE order_id = $1', [orderId])).rows[0].status, 'PAID');

    // The paid items were removed from the cart, and the customer cannot see another customer's order.
    assert.strictEqual((await query('SELECT COUNT(*) AS total FROM cart_items WHERE user_id = $1', [userId])).rows[0].total, 0);
    const stranger = await register('stranger@test.com');
    assert.strictEqual((await request(app).get(`/api/orders/${orderId}`).set(authHeader(stranger))).status, 404);
  });
});
