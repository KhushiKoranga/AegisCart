// Private image storage. Files are saved in a folder that the web server never serves directly.
// Customers can only get an image through an API route that checks who owns it.
// To use cloud storage later (for example a private S3 bucket), only this file needs to change.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');

const storageRoot = path.resolve(environment.privateStorageDir);

// Stops keys like "../../secret" from escaping the storage folder.
function fullPathFor(key) {
  const resolved = path.resolve(storageRoot, key);
  if (!resolved.startsWith(storageRoot + path.sep)) throw new Error('Invalid storage key');
  return resolved;
}

async function saveImage(folder, imageBuffer) {
  const key = `${folder}/${crypto.randomUUID()}.jpg`;
  const filePath = fullPathFor(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, imageBuffer);
  return key;
}

async function readImage(key) {
  try {
    return await fs.readFile(fullPathFor(key));
  } catch (error) {
    if (error.code === 'ENOENT') throw new AppError('Image not found', 404, 'NOT_FOUND');
    throw error;
  }
}

// A missing file is fine (it may already be deleted).
async function deleteImage(key) {
  if (!key) return;
  try {
    await fs.unlink(fullPathFor(key));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not delete image:', error.message);
  }
}

module.exports = { saveImage, readImage, deleteImage };
