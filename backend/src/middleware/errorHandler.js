const AppError = require('../utils/AppError');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

// Turns known errors into friendly messages. Unknown errors never leak details.
function toKnownError(error) {
  if (error instanceof AppError) return error;
  if (error.type === 'entity.parse.failed') return new AppError('Request body is not valid JSON', 400, 'INVALID_JSON');
  if (error.code === 'LIMIT_FILE_SIZE') return new AppError('The image is too large (maximum 5 MB)', 413, 'FILE_TOO_LARGE');
  if (error.code === 'LIMIT_UNEXPECTED_FILE') return new AppError('Unexpected file field', 400, 'BAD_UPLOAD');
  if (error.code === '23505') return new AppError('This record already exists', 409, 'DUPLICATE');
  if (error.code === '23503') return new AppError('This record is linked to other data', 409, 'LINKED_DATA');
  if (error.code === '23514') return new AppError('A value is outside the allowed range', 400, 'INVALID_VALUE');
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  const knownError = toKnownError(error);
  if (!knownError) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong on our side', code: 'SERVER_ERROR' });
  }
  return res.status(knownError.statusCode).json({ success: false, message: knownError.message, code: knownError.code });
}

module.exports = { notFoundHandler, errorHandler };
