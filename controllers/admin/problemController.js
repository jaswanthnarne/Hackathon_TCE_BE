const ProblemStatement = require('../../models/ProblemStatement');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

exports.list = async (req, res, next) => {
  try {
    const problems = await ProblemStatement.find({}).populate('selectedBy', 'teamId teamName').populate('createdBy', 'name').sort({ category: 1, difficulty: 1 }).lean();
    successResponse(res, 200, 'Problem statements fetched', { problems });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const problem = await ProblemStatement.create({ ...req.body, createdBy: req.admin._id });
    await auditLog(req.admin._id, 'CREATE_QUESTION', {
      targetId: problem._id, targetModel: 'ProblemStatement',
      description: `Created problem statement: ${problem.title}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 201, 'Problem statement created', { problem });
  } catch (error) { next(error); }
};

exports.get = async (req, res, next) => {
  try {
    const problem = await ProblemStatement.findById(req.params.id).populate('selectedBy', 'teamId teamName').lean();
    if (!problem) return errorResponse(res, 404, 'Problem not found');
    successResponse(res, 200, 'Problem fetched', { problem });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const problem = await ProblemStatement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!problem) return errorResponse(res, 404, 'Problem not found');
    await auditLog(req.admin._id, 'UPDATE_QUESTION', {
      targetId: problem._id, targetModel: 'ProblemStatement',
      description: `Updated problem statement: ${problem.title}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Problem updated', { problem });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const problem = await ProblemStatement.findByIdAndDelete(req.params.id);
    if (!problem) return errorResponse(res, 404, 'Problem not found');
    await auditLog(req.admin._id, 'DELETE_QUESTION', {
      targetId: problem._id, targetModel: 'ProblemStatement',
      description: `Deleted problem statement: ${problem.title}`,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, 'Problem deleted');
  } catch (error) { next(error); }
};
