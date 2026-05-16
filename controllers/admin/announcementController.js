const Announcement = require('../../models/Announcement');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

exports.list = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({}).populate('createdBy', 'name').sort({ isPinned: -1, createdAt: -1 }).lean();
    successResponse(res, 200, 'Announcements fetched', { announcements });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const announcement = await Announcement.create({ ...req.body, createdBy: req.admin._id });
    await auditLog(req.admin._id, 'CREATE_ANNOUNCEMENT', {
      targetId: announcement._id, targetModel: 'Announcement',
      description: `Created announcement: ${announcement.title}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 201, 'Announcement created', { announcement });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!announcement) return errorResponse(res, 404, 'Announcement not found');
    await auditLog(req.admin._id, 'UPDATE_ANNOUNCEMENT', {
      targetId: announcement._id, targetModel: 'Announcement',
      description: `Updated announcement: ${announcement.title}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Announcement updated', { announcement });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return errorResponse(res, 404, 'Announcement not found');
    await auditLog(req.admin._id, 'DELETE_ANNOUNCEMENT', {
      targetId: announcement._id, targetModel: 'Announcement',
      description: `Deleted announcement: ${announcement.title}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Announcement deleted');
  } catch (error) { next(error); }
};

exports.togglePin = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return errorResponse(res, 404, 'Announcement not found');
    announcement.isPinned = !announcement.isPinned;
    await announcement.save();
    await auditLog(req.admin._id, 'PIN_ANNOUNCEMENT', {
      targetId: announcement._id, targetModel: 'Announcement',
      description: `${announcement.isPinned ? 'Pinned' : 'Unpinned'} announcement: ${announcement.title}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'}`, { announcement });
  } catch (error) { next(error); }
};
