// Small timers that keep the data healthy. No extra queue or library is needed.
const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const tryOnService = require('../services/tryOnService');

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

// A failed job is logged and tried again at the next tick.
function runEvery(intervalMs, jobName, job) {
  const timer = setInterval(async () => {
    try {
      const count = await job();
      if (count > 0) console.log(`${jobName}: handled ${count}`);
    } catch (error) {
      console.error(`${jobName} failed:`, error.message);
    }
  }, intervalMs);
  timer.unref(); // does not keep the process alive on its own
}

function startBackgroundJobs() {
  // Check Razorpay first for payments we may have missed, then give back stock of unpaid orders.
  runEvery(ONE_MINUTE, 'Payment reconciliation', paymentService.reconcileOpenPayments);
  runEvery(ONE_MINUTE, 'Expired reservations released', orderService.expireUnpaidOrders);
  runEvery(ONE_HOUR, 'Old try-on images deleted', tryOnService.deleteExpiredImages);
}

module.exports = { startBackgroundJobs };
