const { fail, isMissing, requireInteger } = require('./validationHelpers');

// The photo is sent as multipart form data, so "consent" arrives as the text "true".
function validatePhotoUpload(body, file) {
  if (!file) fail('Please choose a photo to upload');
  if (body.consentGiven !== 'true') fail('You must agree to the photo processing notice to use Virtual Try-On');
}

function validateTryOnRequest(body) {
  return {
    photoId: requireInteger(body.photoId, 'Photo id'),
    productId: requireInteger(body.productId, 'Product id'),
    // Optional: when missing, the service picks a variant that has a garment image.
    variantId: isMissing(body.variantId) ? null : requireInteger(body.variantId, 'Variant id'),
  };
}

module.exports = { validatePhotoUpload, validateTryOnRequest };
