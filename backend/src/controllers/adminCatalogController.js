const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { parseProductFilters } = require('../validators/productValidator');
const validator = require('../validators/adminValidator');
const productService = require('../services/productService');
const catalogService = require('../services/adminCatalogService');
const inventoryService = require('../services/inventoryService');

const listCategories = asyncHandler(async (req, res) => {
  sendSuccess(res, await productService.listCategories());
});

const createCategory = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.createCategory(validator.validateCategory(req.body)), 201);
});

const renameCategory = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.renameCategory(parseId(req.params.id), validator.validateCategory(req.body)));
});

const deleteCategory = asyncHandler(async (req, res) => {
  await catalogService.deleteCategory(parseId(req.params.id));
  sendSuccess(res, { message: 'Category deleted' });
});

const listProducts = asyncHandler(async (req, res) => {
  sendSuccess(res, await productService.listProducts(parseProductFilters(req.query), { includeHidden: true }));
});

const getProduct = asyncHandler(async (req, res) => {
  sendSuccess(res, await productService.getProductDetails(parseId(req.params.id), { includeHidden: true }));
});

const createProduct = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.createProduct(validator.validateProduct(req.body)), 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.updateProduct(parseId(req.params.id), validator.validateProduct(req.body)));
});

const setProductActive = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.setProductActive(parseId(req.params.id), validator.validateAvailability(req.body)));
});

const deleteProduct = asyncHandler(async (req, res) => {
  await catalogService.deleteProduct(parseId(req.params.id));
  sendSuccess(res, { message: 'Product deleted' });
});

const addProductImage = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.addProductImage(parseId(req.params.id), validator.validateProductImage(req.body)), 201);
});

const deleteProductImage = asyncHandler(async (req, res) => {
  await catalogService.deleteProductImage(parseId(req.params.imageId, 'Image id'));
  sendSuccess(res, { message: 'Image deleted' });
});

const listVariants = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.listVariants(parseId(req.params.id)));
});

const addVariant = asyncHandler(async (req, res) => {
  const variant = validator.validateVariant(req.body);
  sendSuccess(res, await catalogService.addVariant(parseId(req.params.id), variant, req.user.id), 201);
});

const updateVariant = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.updateVariant(parseId(req.params.variantId, 'Variant id'), validator.validateVariant(req.body)));
});

const deleteVariant = asyncHandler(async (req, res) => {
  await catalogService.deleteVariant(parseId(req.params.variantId, 'Variant id'));
  sendSuccess(res, { message: 'Variant deleted' });
});

const setStock = asyncHandler(async (req, res) => {
  const { newQuantity } = validator.validateStockUpdate(req.body);
  const variantId = parseId(req.params.variantId, 'Variant id');
  sendSuccess(res, await inventoryService.setStockByAdmin({ variantId, newQuantity, adminId: req.user.id }));
});

const listInventoryLogs = asyncHandler(async (req, res) => {
  sendSuccess(res, await inventoryService.listInventoryLogs());
});

module.exports = {
  listCategories, createCategory, renameCategory, deleteCategory, listProducts, getProduct, createProduct,
  updateProduct, setProductActive, deleteProduct, addProductImage, deleteProductImage, listVariants,
  addVariant, updateVariant, deleteVariant, setStock, listInventoryLogs,
};
