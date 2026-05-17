const HackathonConfig = require('../../models/HackathonConfig');
const cloudinary = require('../../config/cloudinary');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

exports.getConfig = async (req, res, next) => {
  try {
    let config = await HackathonConfig.findOne().lean();
    if (!config) config = await HackathonConfig.create({});
    if (config.timer && config.timer.status === 'running' && config.timer.lastStartedAt) {
      const elapsed = Math.floor((Date.now() - new Date(config.timer.lastStartedAt).getTime()) / 1000);
      config.timer.remaining = Math.max(0, config.timer.remaining - elapsed);
      if (config.timer.remaining === 0) {
        config.timer.status = 'idle';
      }
    }
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

exports.updateTimer = async (req, res, next) => {
  try {
    const { action, seconds, duration } = req.body;
    let config = await HackathonConfig.findOne();
    if (!config) config = new HackathonConfig();
    if (!config.timer) {
      config.timer = { status: 'idle', duration: 86400, remaining: 86400, lastStartedAt: null };
    }

    // Calculate current remaining if running
    if (config.timer.status === 'running' && config.timer.lastStartedAt) {
      const elapsed = Math.floor((Date.now() - new Date(config.timer.lastStartedAt).getTime()) / 1000);
      config.timer.remaining = Math.max(0, config.timer.remaining - elapsed);
    }

    if (action === 'start') {
      if (config.timer.status !== 'running') {
        config.timer.status = 'running';
        config.timer.lastStartedAt = new Date();
      }
    } else if (action === 'pause') {
      if (config.timer.status === 'running') {
        config.timer.status = 'paused';
        config.timer.lastStartedAt = null;
      }
    } else if (action === 'reset') {
      config.timer.status = 'idle';
      config.timer.remaining = config.timer.duration;
      config.timer.lastStartedAt = null;
    } else if (action === 'add') {
      const addSecs = parseInt(seconds) || 0;
      config.timer.remaining = Math.max(0, config.timer.remaining + addSecs);
      config.timer.duration = Math.max(0, config.timer.duration + addSecs);
      if (config.timer.status === 'running') {
        config.timer.lastStartedAt = new Date();
      }
    } else if (action === 'set_duration') {
      const newDur = parseInt(duration) || 86400;
      config.timer.duration = newDur;
      config.timer.remaining = newDur;
      config.timer.status = 'idle';
      config.timer.lastStartedAt = null;
    }

    config.updatedBy = req.admin._id;
    await config.save();
    await auditLog(req.admin._id, 'UPDATE_TIMER', { targetId: config._id, targetModel: 'HackathonConfig', description: `Timer action: ${action}`, ipAddress: req.ip });

    const timerObj = config.toObject().timer;
    successResponse(res, 200, `Timer ${action} successful`, { timer: timerObj });
  } catch (error) { next(error); }
};
