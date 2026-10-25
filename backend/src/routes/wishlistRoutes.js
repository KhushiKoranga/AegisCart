const express = require('express');
const controller = require('../controllers/wishlistController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.listWishlist);
router.post('/', controller.addProduct);
router.delete('/:productId', controller.removeProduct);

module.exports = router;
