const AdminActionLog = require('../../models/AdminActionLog');
const { successResponse } = require('../../utils/apiResponse');

exports.getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, adminId, actionType, startDate, endDate } = req.query;
    const query = {};
    if (adminId) query.adminId = adminId;
    if (actionType) query.actionType = actionType;
    if (startDate || endDate) { query.createdAt = {}; if (startDate) query.createdAt.$gte = new Date(startDate); if (endDate) query.createdAt.$lte = new Date(endDate); }

    const total = await AdminActionLog.countDocuments(query);
    const logs = await AdminActionLog.find(query).populate('adminId', 'name email').sort({ createdAt: -1 }).skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit)).lean();
    successResponse(res, 200, 'Audit logs fetched', { logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
};
