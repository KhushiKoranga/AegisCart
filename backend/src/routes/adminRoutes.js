const express = require('express');
const catalog = require('../controllers/adminCatalogController');
const sales = require('../controllers/adminSalesController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Every admin route needs a valid login AND the ADMIN role, checked here on the server.
router.use(authenticate, requireAdmin);

router.get('/dashboard', sales.getDashboard);
router.get('/reports/sales', sales.getSalesReport);
router.get('/customers', sales.listCustomers);

router.get('/categories', catalog.listCategories);
router.post('/categories', catalog.createCategory);
router.put('/categories/:id', catalog.renameCategory);
router.delete('/categories/:id', catalog.deleteCategory);

router.get('/products', catalog.listProducts);
router.post('/products', catalog.createProduct);
router.get('/products/:id', catalog.getProduct);
router.put('/products/:id', catalog.updateProduct);
router.patch('/products/:id/availability', catalog.setProductActive);
router.delete('/products/:id', catalog.deleteProduct);
router.post('/products/:id/images', catalog.addProductImage);
router.delete('/product-images/:imageId', catalog.deleteProductImage);

router.get('/products/:id/variants', catalog.listVariants);
router.post('/products/:id/variants', catalog.addVariant);
router.put('/variants/:variantId', catalog.updateVariant);
router.delete('/variants/:variantId', catalog.deleteVariant);
router.patch('/variants/:variantId/stock', catalog.setStock);
router.get('/inventory-logs', catalog.listInventoryLogs);

router.get('/orders', sales.listOrders);
router.get('/orders/:id', sales.getOrder);
router.patch('/orders/:id/status', sales.updateOrderStatus);

router.get('/flash-sales', sales.listFlashSales);
router.post('/flash-sales', sales.createFlashSale);
router.patch('/flash-sales/:id', sales.setFlashSaleActive);
router.delete('/flash-sales/:id', sales.deleteFlashSale);

module.exports = router;
