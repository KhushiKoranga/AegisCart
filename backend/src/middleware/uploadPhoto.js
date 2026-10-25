const multer = require('multer');
const AppError = require('../utils/AppError');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// The file stays in memory. The try-on service checks and re-encodes it before saving.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return callback(new AppError('Only JPEG, PNG or WebP images are allowed', 400, 'INVALID_IMAGE'));
    }
    return callback(null, true);
  },
});

module.exports = upload.single('photo');
