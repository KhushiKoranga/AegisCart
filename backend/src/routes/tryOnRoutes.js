const express = require('express');
const controller = require('../controllers/tryOnController');
const authenticate = require('../middleware/authenticate');
const uploadPhoto = require('../middleware/uploadPhoto');
const { tryOnLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticate);

router.post('/photos', tryOnLimiter, uploadPhoto, controller.uploadPhoto);
router.delete('/photos/:photoId', controller.deletePhoto);

// Fixed paths must come before "/:id" so "history" and "saved" are not read as ids.
router.get('/history', controller.listHistory);
router.get('/saved', controller.listSaved);

router.post('/', tryOnLimiter, controller.createTryOn);
router.get('/:id', controller.getTryOn);
router.get('/:id/image', controller.getImage);
router.post('/:id/save', controller.saveResult);
router.delete('/:id/save', controller.unsaveResult);
router.delete('/:id', controller.deleteTryOn);

module.exports = router;
