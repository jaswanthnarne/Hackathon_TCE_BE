const HackathonConfig = require('../../models/HackathonConfig');
const cloudinary = require('../../config/cloudinary');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

exports.getConfig = async (req, res, next) => {
  try {
    let config = await HackathonConfig.findOne().lean();
    if (!config) config = await HackathonConfig.create({});
    successResponse(res, 200, 'Config fetched', { config });
  } catch (error) { next(error); }
};

exports.updateConfig = async (req, res, next) => {
  try {
    let config = await HackathonConfig.findOne();
    if (!config) config = new HackathonConfig();
    Object.assign(config, req.body, { updatedBy: req.admin._id });
    await config.save();
    await auditLog(req.admin._id, 'UPDATE_CONFIG', { targetId: config._id, targetModel: 'HackathonConfig', description: 'Updated hackathon config', ipAddress: req.ip });
    successResponse(res, 200, 'Config updated', { config });
  } catch (error) { next(error); }
};

exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 400, 'No file uploaded');
    let config = await HackathonConfig.findOne();
    if (!config) config = new HackathonConfig();
    config.logoUrl = req.file.path;
    config.updatedBy = req.admin._id;
    await config.save();
    await auditLog(req.admin._id, 'UPLOAD_LOGO', { targetId: config._id, targetModel: 'HackathonConfig', description: 'Uploaded logo', ipAddress: req.ip });
    successResponse(res, 200, 'Logo uploaded', { logoUrl: config.logoUrl });
  } catch (error) { next(error); }
};

exports.uploadBanner = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 400, 'No file uploaded');
    let config = await HackathonConfig.findOne();
    if (!config) config = new HackathonConfig();
    config.bannerUrl = req.file.path;
    config.updatedBy = req.admin._id;
    await config.save();
    await auditLog(req.admin._id, 'UPLOAD_BANNER', { targetId: config._id, targetModel: 'HackathonConfig', description: 'Uploaded banner', ipAddress: req.ip });
    successResponse(res, 200, 'Banner uploaded', { bannerUrl: config.bannerUrl });
  } catch (error) { next(error); }
};
