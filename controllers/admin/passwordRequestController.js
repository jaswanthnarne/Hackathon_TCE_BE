const PasswordResetRequest = require('../../models/PasswordResetRequest');
const Team = require('../../models/Team');
const generatePassword = require('../../utils/generatePassword');
const { sendEmail } = require('../../config/email');
const { passwordResetApprovedTemplate, passwordResetDeniedTemplate } = require('../../utils/emailTemplates');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { auditLog } = require('../../middleware/auditLogger');

exports.listRequests = async (req, res, next) => {
  try {
    const requests = await PasswordResetRequest.find({}).populate('teamId', 'teamId teamName teamLead').sort({ requestedAt: -1 }).lean();
    successResponse(res, 200, 'Password reset requests fetched', { requests });
  } catch (error) { next(error); }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id).populate('teamId');
    if (!request) return errorResponse(res, 404, 'Request not found');
    if (request.status !== 'pending') return errorResponse(res, 400, 'Request already resolved');

    const team = await Team.findById(request.teamId._id).select('+password');
    const newPassword = generatePassword();
    team.passwordHistory = [...(team.passwordHistory || []).slice(-2), { hash: team.password, changedAt: new Date() }];
    team.password = newPassword;
    team.forcePasswordChange = true;
    team.passwordResetRequested = false;
    await team.save();

    request.status = 'approved';
    request.resolvedBy = req.admin._id;
    request.resolvedAt = new Date();
    await request.save();

    const emailData = passwordResetApprovedTemplate({ teamId: team.teamId, teamName: team.teamName, password: newPassword, leadName: team.teamLead.name });
    await sendEmail({ to: team.teamLead.email, subject: emailData.subject, html: emailData.html });

    await auditLog(req.admin._id, 'APPROVE_PASSWORD_RESET', { targetId: team._id, targetModel: 'Team', description: `Approved password reset for ${team.teamId}`, ipAddress: req.ip });
    successResponse(res, 200, 'Password reset approved and emailed');
  } catch (error) { next(error); }
};

exports.denyRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const request = await PasswordResetRequest.findById(req.params.id).populate('teamId');
    if (!request) return errorResponse(res, 404, 'Request not found');

    request.status = 'denied';
    request.adminNote = reason || '';
    request.resolvedBy = req.admin._id;
    request.resolvedAt = new Date();
    await request.save();

    const team = request.teamId;
    if (team) {
      team.passwordResetRequested = false;
      await Team.findByIdAndUpdate(team._id, { passwordResetRequested: false });
      const emailData = passwordResetDeniedTemplate({ teamId: team.teamId, teamName: team.teamName, leadName: team.teamLead?.name, reason });
      await sendEmail({ to: team.teamLead?.email, subject: emailData.subject, html: emailData.html });
    }

    await auditLog(req.admin._id, 'DENY_PASSWORD_RESET', { targetId: request.teamId?._id, targetModel: 'Team', description: `Denied password reset for ${team?.teamId}`, reason, ipAddress: req.ip });
    successResponse(res, 200, 'Password reset denied');
  } catch (error) { next(error); }
};
