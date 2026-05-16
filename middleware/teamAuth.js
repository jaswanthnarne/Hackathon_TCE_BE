const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const { errorResponse } = require('../utils/apiResponse');

const teamAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return errorResponse(res, 401, 'Access denied. No token provided.');

    const decoded = jwt.verify(token, process.env.JWT_SECRET + '_TEAM');
    if (decoded.role !== 'team') return errorResponse(res, 403, 'Access denied.');

    const team = await Team.findById(decoded.id);
    if (!team) return errorResponse(res, 401, 'Team not found.');
    if (team.isAccountLocked()) return errorResponse(res, 403, 'Account is locked. Contact admin.');
    if (team.status === 'locked') return errorResponse(res, 403, `Account locked: ${team.lockReason || 'Contact admin.'}`);

    req.team = team;

    // Check force password change
    if (team.forcePasswordChange && !req.path.includes('change-password') && req.method !== 'OPTIONS') {
      return errorResponse(res, 403, 'Password change required.', [{ field: 'forcePasswordChange', message: 'You must change your password before accessing any features.' }]);
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return errorResponse(res, 401, 'Session expired. Please login again.');
    if (error.name === 'JsonWebTokenError') return errorResponse(res, 401, 'Invalid token.');
    return errorResponse(res, 500, 'Authentication error.');
  }
};

module.exports = teamAuth;
