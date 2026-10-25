// The try-on workflow and its database records. The AI call itself is in virtualTryOnService.js.
const sharp = require('sharp');
const { query } = require('../config/database');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');
const { TRYON_STATUS } = require('../utils/constants');
const storageService = require('./storageService');
const virtualTryOnService = require('./virtualTryOnService');

const MAX_PROCESSING_MINUTES = 10;

// Re-encoding with sharp proves the file is a real image and removes hidden metadata (such as GPS).
async function prepareImage(buffer, maxSize) {
  try {
    return await sharp(buffer).rotate().resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 }).toBuffer();
  } catch (error) {
    throw new AppError('This file is not a valid image', 400, 'INVALID_IMAGE');
  }
}

async function uploadPhoto(userId, file) {
  const cleanImage = await prepareImage(file.buffer, 1024);
  const imagePath = await storageService.saveImage(`photos/${userId}`, cleanImage);
  const result = await query(
    'INSERT INTO tryon_photos (user_id, image_path, consent_given) VALUES ($1, $2, TRUE) RETURNING id, created_at',
    [userId, imagePath]
  );
  return result.rows[0];
}

async function loadOwnedPhoto(userId, photoId) {
  const result = await query('SELECT id, image_path FROM tryon_photos WHERE id = $1 AND user_id = $2', [photoId, userId]);
  if (result.rowCount === 0) throw new AppError('Photo not found. Please upload it again.', 404, 'NOT_FOUND');
  return result.rows[0];
}

// Chooses the exact variant (colour) to try on. Without a variantId, any variant with a garment image is used.
async function findGarmentVariant(productId, variantId) {
  const values = [productId];
  let variantFilter = 'AND v.garment_image_url IS NOT NULL';
  if (variantId) {
    values.push(variantId);
    variantFilter = 'AND v.id = $2';
  }
  const result = await query(
    `SELECT v.id AS variant_id, v.color, v.garment_image_url, p.name AS product_name, p.try_on_category
     FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE p.id = $1 AND p.is_active = TRUE ${variantFilter}
     ORDER BY v.stock_quantity DESC, v.id LIMIT 1`,
    values
  );
  const variant = result.rows[0];
  if (!variant) throw new AppError('No garment image is available for this product, so a preview cannot be generated.', 422, 'NO_GARMENT_IMAGE');
  if (!variant.tryOnCategory) throw new AppError('This product cannot be tried on yet.', 422, 'TRYON_NOT_SUPPORTED');
  if (!variant.garmentImageUrl) {
    throw new AppError(`There is no garment image for the ${variant.color} colour, so a preview cannot be generated.`, 422, 'NO_GARMENT_IMAGE');
  }
  return variant;
}

async function createTryOn(userId, { photoId, productId, variantId }) {
  virtualTryOnService.assertConfigured();
  const photo = await loadOwnedPhoto(userId, photoId);
  const variant = await findGarmentVariant(productId, variantId);

  const inserted = await query(
    `INSERT INTO virtual_tryon_history (user_id, photo_id, product_id, variant_id, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, photo.id, productId, variant.variantId, TRYON_STATUS.pending]
  );
  const tryOnId = inserted.rows[0].id;

  try {
    const personImage = await storageService.readImage(photo.imagePath);
    const { jobId } = await virtualTryOnService.startTryOn({
      personImage,
      garmentImageUrl: variant.garmentImageUrl,
      garmentDescription: `${variant.color} ${variant.productName}`,
      category: variant.tryOnCategory,
    });
    await query('UPDATE virtual_tryon_history SET status = $2, provider_job_id = $3 WHERE id = $1', [tryOnId, TRYON_STATUS.processing, jobId]);
  } catch (error) {
    await query('UPDATE virtual_tryon_history SET status = $2, error_message = $3 WHERE id = $1', [tryOnId, TRYON_STATUS.failed, error.message]);
    throw error;
  }
  return getTryOn(userId, tryOnId);
}

const RECORD_SQL = `
  SELECT h.id, h.status, h.product_id, h.variant_id, h.provider_job_id, h.result_image_path, h.error_message, h.created_at,
         p.name AS product_name, v.color, v.size,
         EXISTS (SELECT 1 FROM saved_tryon_results s WHERE s.tryon_id = h.id) AS is_saved
  FROM virtual_tryon_history h
  JOIN products p ON p.id = h.product_id
  JOIN product_variants v ON v.id = h.variant_id`;

async function loadOwnedRecord(userId, tryOnId) {
  const result = await query(`${RECORD_SQL} WHERE h.id = $1 AND h.user_id = $2`, [tryOnId, userId]);
  // Same answer for "does not exist" and "belongs to someone else", so ids cannot be guessed.
  if (result.rowCount === 0) throw new AppError('Try-on result not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

function toResponse(record) {
  return {
    id: record.id,
    status: record.status,
    productId: record.productId,
    productName: record.productName,
    variantId: record.variantId,
    color: record.color,
    size: record.size,
    isSaved: record.isSaved,
    errorMessage: record.status === TRYON_STATUS.failed ? record.errorMessage : null,
    createdAt: record.createdAt,
    // The image is private: the app downloads it from this route with its login token.
    imageUrl: record.status === TRYON_STATUS.completed ? `/virtual-try-on/${record.id}/image` : null,
  };
}

async function markFailed(tryOnId, message) {
  await query('UPDATE virtual_tryon_history SET status = $2, error_message = $3 WHERE id = $1 AND status = $4',
    [tryOnId, TRYON_STATUS.failed, message, TRYON_STATUS.processing]);
}

async function saveFinishedImage(record, rawImage) {
  const jpegImage = await prepareImage(rawImage, 1536);
  const imagePath = await storageService.saveImage(`results/${record.id}`, jpegImage);
  const updated = await query(
    'UPDATE virtual_tryon_history SET status = $2, result_image_path = $3 WHERE id = $1 AND status = $4 RETURNING id',
    [record.id, TRYON_STATUS.completed, imagePath, TRYON_STATUS.processing]
  );
  // Another request finished first: remove our duplicate file.
  if (updated.rowCount === 0) await storageService.deleteImage(imagePath);
}

// Asks the AI provider whether a processing job has finished. Called every time the app polls.
async function refreshFromProvider(record) {
  const ageInMinutes = (Date.now() - new Date(record.createdAt).getTime()) / 60000;
  if (ageInMinutes > MAX_PROCESSING_MINUTES) {
    await markFailed(record.id, 'The AI service took too long. Please try again.');
    return;
  }

  let check;
  try {
    check = await virtualTryOnService.checkTryOn(record.providerJobId);
  } catch (error) {
    return; // a temporary provider problem: keep the status as "processing" and check again next time
  }

  if (check.status === 'failed') await markFailed(record.id, check.message);
  if (check.status === 'completed') await saveFinishedImage(record, check.image);
}

async function getTryOn(userId, tryOnId) {
  let record = await loadOwnedRecord(userId, tryOnId);
  if (record.status === TRYON_STATUS.processing) {
    await refreshFromProvider(record);
    record = await loadOwnedRecord(userId, tryOnId);
  }
  return toResponse(record);
}

async function listHistory(userId, { savedOnly = false } = {}) {
  const savedFilter = savedOnly ? 'AND EXISTS (SELECT 1 FROM saved_tryon_results s WHERE s.tryon_id = h.id)' : '';
  const result = await query(`${RECORD_SQL} WHERE h.user_id = $1 ${savedFilter} ORDER BY h.id DESC LIMIT 100`, [userId]);
  return result.rows.map(toResponse);
}

async function saveResult(userId, tryOnId) {
  const record = await loadOwnedRecord(userId, tryOnId);
  if (record.status !== TRYON_STATUS.completed) throw new AppError('Only finished previews can be saved', 409, 'NOT_COMPLETED');
  await query('INSERT INTO saved_tryon_results (user_id, tryon_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, tryOnId]);
  return getTryOn(userId, tryOnId);
}

async function unsaveResult(userId, tryOnId) {
  await loadOwnedRecord(userId, tryOnId);
  await query('DELETE FROM saved_tryon_results WHERE user_id = $1 AND tryon_id = $2', [userId, tryOnId]);
  return getTryOn(userId, tryOnId);
}

// Deleting a try-on deletes the generated image too. The uploaded photo stays so the customer
// can try other outfits. It has its own delete route and is removed automatically after the retention time.
async function deleteTryOn(userId, tryOnId) {
  const result = await query(
    'DELETE FROM virtual_tryon_history WHERE id = $1 AND user_id = $2 RETURNING result_image_path',
    [tryOnId, userId]
  );
  if (result.rowCount === 0) throw new AppError('Try-on result not found', 404, 'NOT_FOUND');
  await storageService.deleteImage(result.rows[0].resultImagePath);
}

async function deletePhoto(userId, photoId) {
  const result = await query('DELETE FROM tryon_photos WHERE id = $1 AND user_id = $2 RETURNING image_path', [photoId, userId]);
  if (result.rowCount === 0) throw new AppError('Photo not found', 404, 'NOT_FOUND');
  await storageService.deleteImage(result.rows[0].imagePath);
}

async function getResultImage(userId, tryOnId) {
  const record = await loadOwnedRecord(userId, tryOnId);
  if (!record.resultImagePath) throw new AppError('This preview has no image yet', 404, 'NOT_FOUND');
  return storageService.readImage(record.resultImagePath);
}

// Retention policy: uploaded photos and previews that were NOT saved are deleted after
// TRYON_RETENTION_HOURS. Saved previews stay until the customer deletes them.
async function deleteExpiredImages() {
  const hours = environment.tryOn.retentionHours;
  const oldPhotos = await query('DELETE FROM tryon_photos WHERE created_at < NOW() - make_interval(hours => $1) RETURNING image_path', [hours]);
  const oldResults = await query(
    `DELETE FROM virtual_tryon_history h
     WHERE h.created_at < NOW() - make_interval(hours => $1)
       AND NOT EXISTS (SELECT 1 FROM saved_tryon_results s WHERE s.tryon_id = h.id)
     RETURNING result_image_path`,
    [hours]
  );
  for (const photo of oldPhotos.rows) await storageService.deleteImage(photo.imagePath);
  for (const result of oldResults.rows) await storageService.deleteImage(result.resultImagePath);
  return oldPhotos.rowCount + oldResults.rowCount;
}

module.exports = {
  uploadPhoto, createTryOn, getTryOn, listHistory, saveResult, unsaveResult, deleteTryOn,
  deletePhoto, getResultImage, deleteExpiredImages,
};
