const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { parseProductFilters } = require('../validators/productValidator');
const productService = require('../services/productService');

const listProducts = asyncHandler(async (req, res) => {
  sendSuccess(res, await productService.listProducts(parseProductFilters(req.query)));
});

const getProduct = asyncHandler(async (req, res) => {
  sendSuccess(res, await productService.getProductDetails(parseId(req.params.id, 'Product id')));
});

const listCategories = asyncHandler(async (req, res) => {
  sendSuccess(res, await productService.listCategories());
});

module.exports = { listProducts, getProduct, listCategories };
