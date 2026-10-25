const express = require('express');
const controller = require('../controllers/cartController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getCart);
router.post('/items', controller.addItem);
router.patch('/items/:id', controller.updateItem);
router.delete('/items/:id', controller.removeItem);

module.exports = router;
