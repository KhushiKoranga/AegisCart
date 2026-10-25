const express = require('express');
const controller = require('../controllers/orderController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

router.post('/', controller.createOrder);
router.get('/', controller.listOrders);
router.get('/:id', controller.getOrder);
router.post('/:id/cancel', controller.cancelOrder);

module.exports = router;
