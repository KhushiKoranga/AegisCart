const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { requireInteger, isMissing } = require('../validators/validationHelpers');
const validator = require('../validators/adminValidator');
const orderService = require('../services/orderService');
const flashSaleService = require('../services/flashSaleService');
const reportService = require('../services/reportService');

const getDashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getDashboardStats());
});

const getSalesReport = asyncHandler(async (req, res) => {
  const days = isMissing(req.query.days) ? 30 : requireInteger(req.query.days, 'Days', { max: 365 });
  sendSuccess(res, await reportService.getSalesReport(days));
});

const listCustomers = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.listCustomers());
});

const listOrders = asyncHandler(async (req, res) => {
  sendSuccess(res, await orderService.listOrdersForAdmin(req.query.status));
});

const getOrder = asyncHandler(async (req, res) => {
  sendSuccess(res, await orderService.getOrderDetails(parseId(req.params.id, 'Order id')));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const status = validator.validateOrderStatusUpdate(req.body);
  sendSuccess(res, await orderService.updateOrderStatus(parseId(req.params.id, 'Order id'), status));
});

const listFlashSales = asyncHandler(async (req, res) => {
  sendSuccess(res, await flashSaleService.listFlashSales());
});

const createFlashSale = asyncHandler(async (req, res) => {
  sendSuccess(res, await flashSaleService.createFlashSale(validator.validateFlashSale(req.body)), 201);
});

const setFlashSaleActive = asyncHandler(async (req, res) => {
  sendSuccess(res, await flashSaleService.setFlashSaleActive(parseId(req.params.id), validator.validateAvailability(req.body)));
});

const deleteFlashSale = asyncHandler(async (req, res) => {
  await flashSaleService.deleteFlashSale(parseId(req.params.id));
  sendSuccess(res, { message: 'Flash sale deleted' });
});

module.exports = {
  getDashboard, getSalesReport, listCustomers, listOrders, getOrder, updateOrderStatus,
  listFlashSales, createFlashSale, setFlashSaleActive, deleteFlashSale,
};
