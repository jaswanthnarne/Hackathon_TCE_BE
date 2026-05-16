const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Team = require('../../models/Team');
const PasswordResetRequest = require('../../models/PasswordResetRequest');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

exports.login = async (req, res, next) => {
  try {
    const { teamId, password } = req.body;
    const team = await Team.findOne({ teamId }).select('+password');
    if (!team) return errorResponse(res, 401, 'Invalid Team ID or password');

    if (team.isAccountLocked()) {
      const lockTime = team.lockUntil ? Math.ceil((team.lockUntil - Date.now()) / 60000) : 0;
      return errorResponse(res, 403, `Account locked. ${team.isLocked ? `Reason: ${team.lockReason}` : `Try again in ${lockTime} minutes.`}`);
    }
    if (team.status !== 'approved') {
      return errorResponse(res, 403, `Your team registration is currently ${team.status}. Please wait for admin approval.`);
    }

    const isMatch = await team.comparePassword(password);
    if (!isMatch) {
      await team.incrementLoginAttempts();
      const remaining = (parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5) - team.loginAttempts;
      return errorResponse(res, 401, `Invalid password. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Account locked for 15 minutes.'}`);
    }

    await team.resetLoginAttempts();
    team.lastLogin = new Date();
    team.lastLoginIP = req.ip;
    await team.save();

    const token = jwt.sign({ id: team._id, role: 'team', teamId: team.teamId }, process.env.JWT_SECRET + '_TEAM', { expiresIn: process.env.JWT_EXPIRE });

    successResponse(res, 200, 'Login successful', {
      token,
      team: { id: team._id, teamId: team.teamId, teamName: team.teamName, status: team.status, forcePasswordChange: team.forcePasswordChange, teamLead: team.teamLead },
    });
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const team = await Team.findById(req.team._id).select('+password');

    const isMatch = await team.comparePassword(currentPassword);
    if (!isMatch) return errorResponse(res, 401, 'Current password is incorrect');

    // Check password history
    for (const prev of (team.passwordHistory || []).slice(-3)) {
      const reused = await bcrypt.compare(newPassword, prev.hash);
      if (reused) return errorResponse(res, 400, 'Cannot reuse your last 3 passwords');
    }

    team.passwordHistory = [...(team.passwordHistory || []).slice(-2), { hash: team.password, changedAt: new Date() }];
    team.password = newPassword;
    team.forcePasswordChange = false;
    await team.save();

    successResponse(res, 200, 'Password changed successfully');
  } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { teamId, email } = req.body;
    const team = await Team.findOne({ teamId });
    if (!team) return errorResponse(res, 404, 'Team not found');
    if (team.teamLead.email !== email) return errorResponse(res, 400, 'Email does not match team lead email');
    if (team.passwordResetRequested) return errorResponse(res, 400, 'A reset request is already pending');

    team.passwordResetRequested = true;
    await team.save();
    await PasswordResetRequest.create({ teamId: team._id, requestedEmail: email });

    successResponse(res, 200, 'Password reset request submitted. Admin will review and email you.');
  } catch (error) { next(error); }
};
