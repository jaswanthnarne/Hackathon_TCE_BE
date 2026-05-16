const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { errorResponse } = require('../utils/apiResponse');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return errorResponse(res, 401, 'Access denied. No token provided.');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return errorResponse(res, 403, 'Access denied. Admin privileges required.');
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) return errorResponse(res, 401, 'Admin account not found or inactive.');

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return errorResponse(res, 401, 'Token expired. Please login again.');
    if (error.name === 'JsonWebTokenError') return errorResponse(res, 401, 'Invalid token.');
    return errorResponse(res, 500, 'Authentication error.');
  }
};

module.exports = adminAuth;
