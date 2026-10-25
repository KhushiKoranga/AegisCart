const express = require('express');
const controller = require('../controllers/profileController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

router.get('/profile', controller.getProfile);
router.put('/profile', controller.updateProfile);
router.put('/profile/push-token', controller.savePushToken);

router.get('/addresses', controller.listAddresses);
router.post('/addresses', controller.addAddress);
router.put('/addresses/:id', controller.updateAddress);
router.delete('/addresses/:id', controller.deleteAddress);

router.get('/notifications', controller.listNotifications);
router.post('/notifications/read', controller.markNotificationsRead);

module.exports = router;
