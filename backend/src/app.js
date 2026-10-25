const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const environment = require('./config/environment');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const profileRoutes = require('./routes/profileRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const tryOnRoutes = require('./routes/tryOnRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const path = require('path');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: environment.corsOrigins.length > 0 ? environment.corsOrigins : false }));

// The Razorpay webhook signature is calculated on the exact raw bytes, so this route must
// receive the body as a Buffer BEFORE express.json() turns it into an object.
app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '100kb' }));
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'))
);

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api', profileRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/virtual-try-on', tryOnRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
