const express = require('express');
const controller = require('../controllers/productController');

const router = express.Router();

// Browsing the catalogue does not need a login.
router.get('/categories', controller.listCategories);
router.get('/products', controller.listProducts);
router.get('/products/:id', controller.getProduct);

module.exports = router;
