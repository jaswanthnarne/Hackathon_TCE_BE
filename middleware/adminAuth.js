const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { errorResponse } = require('../utils/apiResponse');

// General staff auth: accepts an array of allowed roles
const staffAuth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return errorResponse(res, 401, 'Access denied. No token provided.');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // If specific roles are required, check them
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return errorResponse(res, 403, `Access denied. Requires one of: ${allowedRoles.join(', ')}`);
      }

      const admin = await Admin.findById(decoded.id);
      if (!admin || !admin.isActive) return errorResponse(res, 401, 'Account not found or inactive.');

      req.admin = admin;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') return errorResponse(res, 401, 'Token expired. Please login again.');
      if (error.name === 'JsonWebTokenError') return errorResponse(res, 401, 'Invalid token.');
      return errorResponse(res, 500, 'Authentication error.');
    }
  };
};

// Default adminAuth: only superadmin and admin
const adminAuth = staffAuth(['superadmin', 'admin']);

module.exports = adminAuth;
module.exports.staffAuth = staffAuth;

