const express = require('express');
const controller = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.loginCustomer);
router.post('/admin/login', authLimiter, controller.loginAdmin);
router.post('/refresh', authLimiter, controller.refresh);
router.post('/logout', controller.logout);

module.exports = router;
