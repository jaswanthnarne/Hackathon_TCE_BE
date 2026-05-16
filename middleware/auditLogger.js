const AdminActionLog = require('../models/AdminActionLog');

const auditLog = async (adminId, actionType, details = {}) => {
  try {
    await AdminActionLog.create({
      adminId,
      actionType,
      targetId: details.targetId || null,
      targetModel: details.targetModel || null,
      description: details.description || '',
      oldValue: details.oldValue || null,
      newValue: details.newValue || null,
      reason: details.reason || '',
      ipAddress: details.ipAddress === '::1' ? '127.0.0.1' : (details.ipAddress || ''),
      userAgent: details.userAgent || '',
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

const auditMiddleware = (actionType, targetModel) => {
  return (req, res, next) => {
    req.auditAction = actionType;
    req.auditTargetModel = targetModel;
    next();
  };
};

module.exports = { auditLog, auditMiddleware };
