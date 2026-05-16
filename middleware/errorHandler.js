const { errorResponse } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return errorResponse(res, 400, 'Validation error', errors);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(res, 400, `Duplicate value for ${field}`);
  }

  // Mongoose cast error
  if (err.name === 'CastError') return errorResponse(res, 400, `Invalid ${err.path}: ${err.value}`);

  // Multer error
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') return errorResponse(res, 400, 'File too large');
    return errorResponse(res, 400, err.message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return errorResponse(res, 401, 'Invalid token');
  if (err.name === 'TokenExpiredError') return errorResponse(res, 401, 'Token expired');

  // Custom AppError
  if (err.isOperational) return errorResponse(res, err.statusCode, err.message);

  // Unknown error
  return errorResponse(res, 500, process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message);
};

module.exports = errorHandler;
